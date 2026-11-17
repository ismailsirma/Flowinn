import { contextBridge, ipcRenderer } from 'electron'
import type { MyFlowApi } from '../shared/api'
import type { RunEvent } from '../shared/types'

const api: MyFlowApi = {
  workflows: {
    list: () => ipcRenderer.invoke('workflows:list'),
    get: (id) => ipcRenderer.invoke('workflows:get', id),
    save: (workflow) => ipcRenderer.invoke('workflows:save', workflow),
    remove: (id) => ipcRenderer.invoke('workflows:delete', id)
  },
  run: {
    start: (workflow) => ipcRenderer.invoke('run:start', workflow),
    stop: (runId) => ipcRenderer.invoke('run:stop', runId),
    onEvent: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, event: RunEvent) => callback(event)
      ipcRenderer.on('run:event', listener)
      return () => {
        ipcRenderer.removeListener('run:event', listener)
      }
    }
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings) => ipcRenderer.invoke('settings:save', settings)
  },
  llm: {
    models: () => ipcRenderer.invoke('llm:models')
  }
}

contextBridge.exposeInMainWorld('myflow', api)
