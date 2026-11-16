import { app } from 'electron'
import { join } from 'node:path'
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import type { Workflow, WorkflowSummary } from '../shared/types'

const workflowsDir = () => join(app.getPath('userData'), 'workflows')

const idPattern = /^[a-zA-Z0-9-]+$/

function fileFor(id: string): string {
  if (!idPattern.test(id)) {
    throw new Error('Invalid workflow id')
  }
  return join(workflowsDir(), `${id}.json`)
}

async function ensureDir(): Promise<void> {
  await mkdir(workflowsDir(), { recursive: true })
}

export async function listWorkflows(): Promise<WorkflowSummary[]> {
  await ensureDir()
  const entries = await readdir(workflowsDir())
  const summaries: WorkflowSummary[] = []

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue
    try {
      const raw = await readFile(join(workflowsDir(), entry), 'utf8')
      const workflow = JSON.parse(raw) as Workflow
      summaries.push({
        id: workflow.id,
        name: workflow.name,
        updatedAt: workflow.updatedAt,
        nodeCount: workflow.nodes.length
      })
    } catch {
      continue
    }
  }

  return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getWorkflow(id: string): Promise<Workflow | null> {
  try {
    const raw = await readFile(fileFor(id), 'utf8')
    return JSON.parse(raw) as Workflow
  } catch {
    return null
  }
}

export async function saveWorkflow(workflow: Workflow): Promise<Workflow> {
  await ensureDir()
  const saved: Workflow = {
    ...workflow,
    createdAt: workflow.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  await writeFile(fileFor(saved.id), JSON.stringify(saved, null, 2), 'utf8')
  return saved
}

export async function deleteWorkflow(id: string): Promise<void> {
  try {
    await unlink(fileFor(id))
  } catch {
    return
  }
}
