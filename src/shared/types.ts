export type NodeKind = 'trigger' | 'agent' | 'tool' | 'end'

export type ProviderKind = 'ollama' | 'openai'

export interface ProviderSettings {
  kind: ProviderKind
  host: string
  port: number
}

export interface NodeConfig {
  model?: string
  systemPrompt?: string
  prompt?: string
  temperature?: number
  method?: string
  url?: string
  headers?: string
  body?: string
}

export interface WorkflowNode {
  id: string
  kind: NodeKind
  label: string
  config: NodeConfig
  position: { x: number; y: number }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
}

export interface Workflow {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: string
  updatedAt: string
}

export interface WorkflowSummary {
  id: string
  name: string
  updatedAt: string
  nodeCount: number
}

export type NodeStatus = 'idle' | 'running' | 'done' | 'error'

export type RunEvent =
  | { type: 'run:started'; runId: string }
  | { type: 'node:started'; runId: string; nodeId: string; label: string }
  | { type: 'node:token'; runId: string; nodeId: string; label: string; token: string }
  | { type: 'node:done'; runId: string; nodeId: string; label: string; output: unknown; durationMs: number }
  | { type: 'node:failed'; runId: string; nodeId: string; label: string; error: string }
  | { type: 'run:done'; runId: string; output: unknown; durationMs: number }
  | { type: 'run:failed'; runId: string; error: string }
