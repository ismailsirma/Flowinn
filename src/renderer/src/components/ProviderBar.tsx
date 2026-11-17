import type { ProviderKind, ProviderSettings } from '@shared/types'

interface ProviderBarProps {
  settings: ProviderSettings
  onChange: (patch: Partial<ProviderSettings>) => void
  onSave: () => void
  saving: boolean
  message: string
  error: string
}

const fieldClass =
  'rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500'

export function ProviderBar({ settings, onChange, onSave, saving, message, error }: ProviderBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-4 py-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Provider
      </span>

      <select
        value={settings.kind}
        onChange={(event) => onChange({ kind: event.target.value as ProviderKind })}
        className={fieldClass}
      >
        <option value="ollama">Ollama</option>
        <option value="openai">OpenAI-compatible</option>
      </select>

      <input
        value={settings.host}
        onChange={(event) => onChange({ host: event.target.value })}
        placeholder="host"
        className={`${fieldClass} w-44`}
      />

      <span className="text-xs text-slate-500">:</span>

      <input
        type="number"
        min={1}
        max={65535}
        value={settings.port}
        onChange={(event) => onChange({ port: Number(event.target.value) })}
        placeholder="port"
        className={`${fieldClass} w-24`}
      />

      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Apply'}
      </button>

      {message && <span className="text-xs text-emerald-400">{message}</span>}
      {error && <span className="max-w-72 truncate text-xs text-rose-400">{error}</span>}

      <span className="text-[11px] text-slate-500">
        Point at any local LLM server with an Ollama or OpenAI-compatible API.
      </span>
    </div>
  )
}
