import type { RunEvent, Workflow, WorkflowNode } from '../shared/types'
import { chatStream } from './ollama'

export interface NodeResult {
  text: string
  output: unknown
}

export type Context = Record<string, NodeResult>

export function renderTemplate(template: string, context: Context): string {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_-]+)(?:\.(json|text))?\s*\}\}/g,
    (_match, id: string, field?: string) => {
      const result = context[id]
      if (!result) return ''
      if (field === 'json') return JSON.stringify(result.output)
      return result.text
    }
  )
}

export function topologicalOrder(workflow: Workflow): WorkflowNode[] {
  const byId = new Map(workflow.nodes.map((node) => [node.id, node]))
  const incoming = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const node of workflow.nodes) {
    incoming.set(node.id, 0)
    adjacency.set(node.id, [])
  }

  for (const edge of workflow.edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue
    adjacency.get(edge.source)!.push(edge.target)
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1)
  }

  const queue = workflow.nodes.filter((node) => incoming.get(node.id) === 0).map((node) => node.id)
  const orderedIds: string[] = []

  while (queue.length > 0) {
    const id = queue.shift()!
    orderedIds.push(id)
    for (const target of adjacency.get(id) ?? []) {
      const next = (incoming.get(target) ?? 0) - 1
      incoming.set(target, next)
      if (next === 0) queue.push(target)
    }
  }

  if (orderedIds.length !== workflow.nodes.length) {
    throw new Error('Workflow contains a cycle')
  }

  return orderedIds.map((id) => byId.get(id)!)
}

export function validateWorkflow(workflow: Workflow): void {
  const triggers = workflow.nodes.filter((node) => node.kind === 'trigger')
  if (triggers.length !== 1) {
    throw new Error('Workflow must contain exactly one trigger node')
  }
  if (workflow.nodes.length === 0) {
    throw new Error('Workflow is empty')
  }

  const adjacency = new Map<string, string[]>()
  for (const node of workflow.nodes) {
    adjacency.set(node.id, [])
  }
  for (const edge of workflow.edges) {
    if (!adjacency.has(edge.source) || !adjacency.has(edge.target)) {
      throw new Error('Workflow contains an edge referencing an unknown node')
    }
    adjacency.get(edge.source)!.push(edge.target)
  }

  topologicalOrder(workflow)

  const reachable = new Set<string>([triggers[0].id])
  const stack = [triggers[0].id]
  while (stack.length > 0) {
    const id = stack.pop()!
    for (const target of adjacency.get(id) ?? []) {
      if (!reachable.has(target)) {
        reachable.add(target)
        stack.push(target)
      }
    }
  }

  for (const node of workflow.nodes) {
    if (!reachable.has(node.id)) {
      throw new Error(`Node "${node.label}" is not connected to the trigger`)
    }
  }
}

async function executeNode(
  node: WorkflowNode,
  context: Context,
  onToken: (token: string) => void,
  signal: AbortSignal
): Promise<NodeResult> {
  if (node.kind === 'trigger') {
    return { text: '', output: null }
  }

  if (node.kind === 'end') {
    const output = Object.fromEntries(
      Object.entries(context).map(([id, result]) => [id, result.output])
    )
    return { text: JSON.stringify(output, null, 2), output }
  }

  if (node.kind === 'agent') {
    const model = node.config.model?.trim() || 'llama3.2'
    const systemPrompt = renderTemplate(
      node.config.systemPrompt ?? 'You are a helpful assistant.',
      context
    )
    const prompt = renderTemplate(node.config.prompt ?? '', context).trim()
    if (!prompt) {
      throw new Error('Agent prompt is empty')
    }

    const text = await chatStream(
      model,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      onToken,
      { temperature: node.config.temperature, signal }
    )

    return { text, output: text }
  }

  if (node.kind === 'tool') {
    const url = renderTemplate(node.config.url ?? '', context).trim()
    if (!url) {
      throw new Error('Tool URL is empty')
    }
    const method = (node.config.method ?? 'GET').toUpperCase()
    const headersRaw = renderTemplate(node.config.headers ?? '', context).trim()
    let headers: Record<string, string> = {}
    if (headersRaw) {
      try {
        headers = JSON.parse(headersRaw) as Record<string, string>
      } catch {
        throw new Error('Tool headers must be valid JSON')
      }
    }
    const body = renderTemplate(node.config.body ?? '', context).trim()

    const response = await fetch(url, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : body || undefined,
      signal
    })

    if (!response.ok) {
      throw new Error(`Tool request failed with HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    const output = contentType.includes('application/json')
      ? await response.json()
      : await response.text()
    const text = typeof output === 'string' ? output : JSON.stringify(output, null, 2)

    return { text, output }
  }

  throw new Error(`Unsupported node kind: ${node.kind}`)
}

export async function runWorkflow(
  workflow: Workflow,
  runId: string,
  send: (event: RunEvent) => void,
  signal: AbortSignal
): Promise<void> {
  validateWorkflow(workflow)

  const runStarted = performance.now()
  send({ type: 'run:started', runId })

  const order = topologicalOrder(workflow)
  const context: Context = {}

  for (const node of order) {
    if (signal.aborted) {
      throw new Error('Run cancelled')
    }

    send({ type: 'node:started', runId, nodeId: node.id, label: node.label })
    const nodeStarted = performance.now()

    try {
      const result = await executeNode(
        node,
        context,
        (token) => send({ type: 'node:token', runId, nodeId: node.id, label: node.label, token }),
        signal
      )
      context[node.id] = result
      send({
        type: 'node:done',
        runId,
        nodeId: node.id,
        label: node.label,
        output: result.output,
        durationMs: performance.now() - nodeStarted
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      send({
        type: 'node:failed',
        runId,
        nodeId: node.id,
        label: node.label,
        error: signal.aborted ? 'Run cancelled' : message
      })
      throw error
    }
  }

  send({
    type: 'run:done',
    runId,
    output: context,
    durationMs: performance.now() - runStarted
  })
}
