import { ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import type { ProviderSettings, RunEvent, Workflow } from '../shared/types'
import { runWorkflow } from './engine'
import { listModels } from './llm'
import { getProviderSettings, saveProviderSettings } from './settings'
import { deleteWorkflow, getWorkflow, listWorkflows, saveWorkflow } from './store'

const activeRuns = new Map<string, AbortController>()

export function registerIpc(): void {
  ipcMain.handle('workflows:list', () => listWorkflows())
  ipcMain.handle('workflows:get', (_event, id: string) => getWorkflow(id))
  ipcMain.handle('workflows:save', (_event, workflow: Workflow) => saveWorkflow(workflow))
  ipcMain.handle('workflows:delete', (_event, id: string) => deleteWorkflow(id))

  ipcMain.handle('settings:get', () => getProviderSettings())
  ipcMain.handle('settings:save', (_event, settings: ProviderSettings) =>
    saveProviderSettings(settings)
  )
  ipcMain.handle('llm:models', () => getProviderSettings().then((settings) => listModels(settings)))

  ipcMain.handle('run:start', async (event, workflow: Workflow) => {
    const runId = randomUUID()
    const controller = new AbortController()
    activeRuns.set(runId, controller)

    const settings = await getProviderSettings()

    const send = (runEvent: RunEvent) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('run:event', runEvent)
      }
    }

    void runWorkflow(workflow, runId, send, controller.signal, settings)
      .catch((error: unknown) => {
        send({
          type: 'run:failed',
          runId,
          error: error instanceof Error ? error.message : String(error)
        })
      })
      .finally(() => {
        activeRuns.delete(runId)
      })

    return runId
  })

  ipcMain.handle('run:stop', (_event, runId: string) => {
    activeRuns.get(runId)?.abort()
  })
}
