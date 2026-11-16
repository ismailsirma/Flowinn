import { useWorkflowStore } from '../store/workflow'

interface ToolbarProps {
  onSave: () => void
  onRun: () => void
  onStop: () => void
  onNew: () => void
  saving: boolean
  message: string
  error: string
}

export function Toolbar({ onSave, onRun, onStop, onNew, saving, message, error }: ToolbarProps) {
  const name = useWorkflowStore((state) => state.name)
  const setName = useWorkflowStore((state) => state.setName)
  const running = useWorkflowStore((state) => state.running)

  return (
    <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-950 px-4 py-2">
      <span className="text-sm font-bold tracking-wide text-sky-400">MyFlow</span>

      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="w-64 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
        placeholder="Workflow name"
      />

      <div className="flex-1" />

      {message && <span className="text-xs text-emerald-400">{message}</span>}
      {error && <span className="max-w-72 truncate text-xs text-rose-400">{error}</span>}

      <button
        onClick={onNew}
        className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
      >
        New
      </button>

      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>

      {running ? (
        <button
          onClick={onStop}
          className="rounded-md border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/20"
        >
          Stop
        </button>
      ) : (
        <button
          onClick={onRun}
          className="rounded-md border border-sky-500/60 bg-sky-500/10 px-3 py-1.5 text-sm text-sky-300 hover:bg-sky-500/20"
        >
          Run
        </button>
      )}
    </header>
  )
}
