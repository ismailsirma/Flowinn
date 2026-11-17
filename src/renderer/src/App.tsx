import { useCallback, useEffect, useState } from 'react'
import { Canvas } from './components/Canvas'
import { Inspector } from './components/Inspector'
import { LogPanel } from './components/LogPanel'
import { Palette } from './components/Palette'
import { ProviderBar } from './components/ProviderBar'
import { Toolbar } from './components/Toolbar'
import { useWorkflowStore } from './store/workflow'
import type { ProviderSettings } from '@shared/types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export default function App() {
  const [models, setModels] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [settings, setSettings] = useState<ProviderSettings>({
    kind: 'ollama',
    host: 'localhost',
    port: 11434
  })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [providerMessage, setProviderMessage] = useState('')
  const [providerError, setProviderError] = useState('')

  const load = useWorkflowStore((state) => state.load)
  const reset = useWorkflowStore((state) => state.reset)
  const toWorkflow = useWorkflowStore((state) => state.toWorkflow)
  const applyEvent = useWorkflowStore((state) => state.applyEvent)

  const refreshModels = useCallback(async () => {
    try {
      setModels(await window.myflow.llm.models())
    } catch {
      setModels([])
    }
  }, [])

  useEffect(() => {
    if (!window.myflow) return

    let cancelled = false

    window.myflow.settings
      .get()
      .then((value) => {
        if (!cancelled) setSettings(value)
      })
      .catch(() => {
        if (!cancelled) setModels([])
      })

    void refreshModels()

    const unsubscribe = window.myflow.run.onEvent((event) => {
      applyEvent(event)
      if (event.type === 'run:failed') setError(event.error)
    })

    void (async () => {
      try {
        const summaries = await window.myflow.workflows.list()
        if (summaries.length > 0) {
          const workflow = await window.myflow.workflows.get(summaries[0].id)
          if (workflow && !cancelled) load(workflow)
        }
      } catch {
        return
      }
    })()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [applyEvent, load, refreshModels])

  const handleSettingsChange = useCallback((patch: Partial<ProviderSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
    setProviderMessage('')
    setProviderError('')
  }, [])

  const handleSettingsSave = useCallback(async () => {
    setSettingsSaving(true)
    setProviderMessage('')
    setProviderError('')
    try {
      const saved = await window.myflow.settings.save(settings)
      setSettings(saved)
      setProviderMessage('Provider applied')
      await refreshModels()
    } catch (error) {
      setProviderError(errorMessage(error))
    } finally {
      setSettingsSaving(false)
    }
  }, [settings, refreshModels])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await window.myflow.workflows.save(toWorkflow())
      setMessage('Saved')
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [toWorkflow])

  const handleRun = useCallback(async () => {
    setError('')
    setMessage('')
    try {
      const workflow = await window.myflow.workflows.save(toWorkflow())
      useWorkflowStore.getState().clearLogs()
      await window.myflow.run.start(workflow)
    } catch (error) {
      setError(errorMessage(error))
    }
  }, [toWorkflow])

  const handleStop = useCallback(async () => {
    const runId = useWorkflowStore.getState().runId
    if (runId) {
      await window.myflow.run.stop(runId)
    }
  }, [])

  const handleNew = useCallback(() => {
    reset()
    setError('')
    setMessage('')
  }, [reset])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <Toolbar
        onSave={handleSave}
        onRun={handleRun}
        onStop={handleStop}
        onNew={handleNew}
        saving={saving}
        message={message}
        error={error}
      />

      <ProviderBar
        settings={settings}
        onChange={handleSettingsChange}
        onSave={handleSettingsSave}
        saving={settingsSaving}
        message={providerMessage}
        error={providerError}
      />

      <div className="flex min-h-0 flex-1">
        <Palette />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <Canvas />
          </div>
          <LogPanel />
        </main>
        <Inspector models={models} />
      </div>
    </div>
  )
}
