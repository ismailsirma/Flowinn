import type { RunEvent } from '@shared/types'
import { useWorkflowStore } from '../store/workflow'

function describe(event: RunEvent): string {
  switch (event.type) {
    case 'run:started':
      return '[run] started'
    case 'node:started':
      return `[node] ${event.label} started`
    case 'node:done':
      return `[done] ${event.label} in ${Math.round(event.durationMs)} ms`
    case 'node:failed':
      return `[fail] ${event.label}: ${event.error}`
    case 'run:done':
      return `[run] finished in ${Math.round(event.durationMs)} ms`
    case 'run:failed':
      return `[run] failed: ${event.error}`
    case 'node:token':
      return ''
  }
}

function preview(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') {
    return value.length > 400 ? `${value.slice(0, 400)}…` : value
  }
  const text = JSON.stringify(value, null, 2)
  return text.length > 600 ? `${text.slice(0, 600)}…` : text
}

export function LogPanel() {
  const logs = useWorkflowStore((state) => state.logs)
  const clearLogs = useWorkflowStore((state) => state.clearLogs)

  const streams = new Map<string, { label: string; text: string }>()
  const entries: RunEvent[] = []

  for (const event of logs) {
    if (event.type === 'node:token') {
      const stream = streams.get(event.nodeId) ?? { label: event.label, text: '' }
      stream.text += event.token
      streams.set(event.nodeId, stream)
    } else {
      entries.push(event)
    }
  }

  return (
    <section className="border-t border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Run log
        </span>
        <button
          onClick={clearLogs}
          className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400 hover:bg-slate-800"
        >
          Clear
        </button>
      </div>

      <div className="max-h-56 overflow-y-auto px-3 pb-3 font-mono text-xs">
        {logs.length === 0 && <p className="text-slate-500">No run yet.</p>}

        {Array.from(streams.entries()).map(([id, stream]) => (
          <div
            key={id}
            className="mb-2 rounded-md border border-slate-800 bg-slate-900/60 p-2"
          >
            <div className="mb-1 text-[11px] text-slate-500">{stream.label} output</div>
            <pre className="whitespace-pre-wrap text-slate-200">{stream.text}</pre>
          </div>
        ))}

        {entries.map((event, index) => {
          const line = describe(event)
          if (event.type === 'node:done' || event.type === 'run:done') {
            return (
              <div key={index} className="mb-1">
                <div className="text-slate-400">{line}</div>
                <pre className="mt-1 whitespace-pre-wrap text-slate-300">
                  {preview(event.output)}
                </pre>
              </div>
            )
          }
          if (event.type === 'node:failed' || event.type === 'run:failed') {
            return (
              <div key={index} className="mb-1 text-rose-400">
                {line}
              </div>
            )
          }
          return (
            <div key={index} className="mb-1 text-slate-400">
              {line}
            </div>
          )
        })}
      </div>
    </section>
  )
}
