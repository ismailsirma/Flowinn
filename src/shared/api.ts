import type { RunEvent, Workflow, WorkflowSummary } from './types'

export interface MyFlowApi {
  workflows: {
    list: () => Promise<WorkflowSummary[]>
    get: (id: string) => Promise<Workflow | null>
    save: (workflow: Workflow) => Promise<Workflow>
    remove: (id: string) => Promise<void>
  }
  run: {
    start: (workflow: Workflow) => Promise<string>
    stop: (runId: string) => Promise<void>
    onEvent: (callback: (event: RunEvent) => void) => () => void
  }
  ollama: {
    models: () => Promise<string[]>
  }
}
