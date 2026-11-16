import { create } from 'zustand'
import {
  addEdge,
  type Connection,
  type Edge,
  type EdgeChangeset,
  type Node,
  type NodeChangeset
} from '@xyflow/react'
import type { NodeConfig, NodeKind, NodeStatus, RunEvent, Workflow } from '@shared/types'

export interface FlowData {
  [key: string]: unknown
  label: string
  kind: NodeKind
  config: NodeConfig
  status: NodeStatus
}

export type FlowNode = Node<FlowData, NodeKind>

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function makeNode(
  id: string,
  kind: NodeKind,
  label: string,
  position: { x: number; y: number },
  config: NodeConfig = {}
): FlowNode {
  return {
    id,
    type: kind,
    position,
    data: { label, kind, config, status: 'idle' }
  }
}

const agentDefaults: NodeConfig = {
  model: 'llama3.2',
  systemPrompt: 'You are a concise assistant.',
  prompt: 'Write a short greeting for a developer workflow app.',
  temperature: 0.7
}

const toolDefaults: NodeConfig = {
  method: 'GET',
  url: 'https://api.github.com/repos/xyflow/react',
  headers: '{"Accept": "application/json"}',
  body: ''
}

function defaultGraph(): { nodes: FlowNode[]; edges: Edge[] } {
  return {
    nodes: [
      makeNode('trigger-1', 'trigger', 'Trigger', { x: 80, y: 220 }),
      makeNode('agent-1', 'agent', 'Agent', { x: 380, y: 200 }, { ...agentDefaults }),
      makeNode('end-1', 'end', 'End', { x: 680, y: 220 })
    ],
    edges: [
      { id: 'edge-1', source: 'trigger-1', target: 'agent-1' },
      { id: 'edge-2', source: 'agent-1', target: 'end-1' }
    ]
  }
}

interface WorkflowState {
  workflowId: string
  name: string
  createdAt: string
  nodes: FlowNode[]
  edges: Edge[]
  selectedId: string | null
  logs: RunEvent[]
  running: boolean
  runId: string | null
  setName: (name: string) => void
  select: (id: string | null) => void
  onNodesChange: (changes: NodeChangeset<FlowNode>) => void
  onEdgesChange: (changes: EdgeChangeset<Edge>) => void
  onConnect: (connection: Connection) => void
  addNode: (kind: NodeKind) => void
  updateConfig: (id: string, patch: NodeConfig) => void
  updateLabel: (id: string, label: string) => void
  applyEvent: (event: RunEvent) => void
  clearLogs: () => void
  reset: () => void
  load: (workflow: Workflow) => void
  toWorkflow: () => Workflow
}

const initial = defaultGraph()

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflowId: uid(),
  name: 'Untitled workflow',
  createdAt: new Date().toISOString(),
  nodes: initial.nodes,
  edges: initial.edges,
  selectedId: null,
  logs: [],
  running: false,
  runId: null,

  setName: (name) => set({ name }),

  select: (id) => set({ selectedId: id }),

  onNodesChange: (changes) => {
    set({ nodes: changes.applyTo(get().nodes) })
  },

  onEdgesChange: (changes) => {
    set({ edges: changes.applyTo(get().edges) })
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(
        { ...connection, id: `edge-${uid()}` },
        get().edges
      )
    })
  },

  addNode: (kind) => {
    const count = get().nodes.length
    const config: NodeConfig =
      kind === 'agent' ? { ...agentDefaults } : kind === 'tool' ? { ...toolDefaults } : {}
    const label = kind.charAt(0).toUpperCase() + kind.slice(1)
    const node = makeNode(uid(), kind, label, {
      x: 80 + (count % 4) * 240,
      y: 100 + Math.floor(count / 4) * 160
    }, config)
    set({ nodes: [...get().nodes, node], selectedId: node.id })
  },

  updateConfig: (id, patch) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, config: { ...node.data.config, ...patch } } }
          : node
      )
    })
  },

  updateLabel: (id, label) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, label } } : node
      )
    })
  },

  applyEvent: (event) => {
    set((state) => {
      let nodes = state.nodes

      if (event.type === 'run:started') {
        nodes = state.nodes.map((node) => ({
          ...node,
          data: { ...node.data, status: 'idle' }
        }))
      } else if (event.type === 'node:started') {
        nodes = state.nodes.map((node) =>
          node.id === event.nodeId
            ? { ...node, data: { ...node.data, status: 'running' } }
            : node
        )
      } else if (event.type === 'node:done') {
        nodes = state.nodes.map((node) =>
          node.id === event.nodeId
            ? { ...node, data: { ...node.data, status: 'done' } }
            : node
        )
      } else if (event.type === 'node:failed') {
        nodes = state.nodes.map((node) =>
          node.id === event.nodeId
            ? { ...node, data: { ...node.data, status: 'error' } }
            : node
        )
      }

      const logs = [...state.logs, event].slice(-5000)
      let running = state.running
      let runId = state.runId

      if (event.type === 'run:started') {
        running = true
        runId = event.runId
      }
      if (event.type === 'run:done' || event.type === 'run:failed') {
        running = false
        runId = null
      }

      return { ...state, nodes, logs, running, runId }
    })
  },

  clearLogs: () => set({ logs: [] }),

  reset: () => {
    const graph = defaultGraph()
    set({
      workflowId: uid(),
      name: 'Untitled workflow',
      createdAt: new Date().toISOString(),
      nodes: graph.nodes,
      edges: graph.edges,
      selectedId: null,
      logs: [],
      running: false,
      runId: null
    })
  },

  load: (workflow) => {
    set({
      workflowId: workflow.id,
      name: workflow.name,
      createdAt: workflow.createdAt,
      nodes: workflow.nodes.map((node) => ({
        id: node.id,
        type: node.kind,
        position: node.position,
        data: { label: node.label, kind: node.kind, config: node.config, status: 'idle' }
      })),
      edges: workflow.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target
      })),
      selectedId: null,
      logs: [],
      running: false,
      runId: null
    })
  },

  toWorkflow: () => {
    const { workflowId, name, createdAt, nodes, edges } = get()
    return {
      id: workflowId,
      name: name.trim() || 'Untitled workflow',
      nodes: nodes.map((node) => ({
        id: node.id,
        kind: node.data.kind,
        label: node.data.label,
        config: node.data.config,
        position: node.position
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target
      })),
      createdAt,
      updatedAt: new Date().toISOString()
    }
  }
}))
