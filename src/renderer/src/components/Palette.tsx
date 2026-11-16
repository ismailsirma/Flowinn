import type { NodeKind } from '@shared/types'
import { useWorkflowStore } from '../store/workflow'

const items: Array<{ kind: NodeKind; label: string; hint: string; accent: string }> = [
  { kind: 'trigger', label: 'Trigger', hint: 'Manual run entry point', accent: 'border-sky-500/50' },
  { kind: 'agent', label: 'Agent', hint: 'LLM prompt step', accent: 'border-violet-500/50' },
  { kind: 'tool', label: 'Tool', hint: 'HTTP request step', accent: 'border-emerald-500/50' },
  { kind: 'end', label: 'End', hint: 'Output collection', accent: 'border-rose-500/50' }
]

export function Palette() {
  const addNode = useWorkflowStore((state) => state.addNode)

  return (
    <aside className="w-52 shrink-0 border-r border-slate-800 bg-slate-950 p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Nodes
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <button
            key={item.kind}
            onClick={() => addNode(item.kind)}
            className={`rounded-lg border ${item.accent} bg-slate-900/60 px-3 py-2 text-left transition hover:bg-slate-900`}
          >
            <span className="block text-sm font-medium text-slate-200">{item.label}</span>
            <span className="block text-[11px] text-slate-500">{item.hint}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        Add a node, then drag from a node handle to connect it. The graph must contain exactly one
        trigger and no cycles.
      </p>
    </aside>
  )
}
