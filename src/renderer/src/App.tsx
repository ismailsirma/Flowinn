import { useCallback, useEffect, useState } from 'react'
import { Canvas } from './components/Canvas'
import { Inspector } from './components/Inspector'
import { LogPanel } from './components/LogPanel'
import { Palette } from './components/Palette'
import { Toolbar } from './components/Toolbar'
import { useWorkflowStore } from './store/workflow'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export default function App() {
  const [models, setModels] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useWorkflowStore((state) => state.load)
  const reset = useWorkflowStore((state) => state.reset)
  const toWorkflow = useWorkflowStore((state) => state.toWorkflow)
  const applyEvent = useWorkflowStore((state) => state.applyEvent)

  useEffect(() => {
    if (!window.myflow) return

    let cancelled = false

    window.myflow.ollama
      .models()
      .then((list) => {
        if (!cancelled) setModels(list)
      })
      .catch(() => {
        if (!cancelled) setModels([])
      })

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
  }, [applyEvent, load])

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
