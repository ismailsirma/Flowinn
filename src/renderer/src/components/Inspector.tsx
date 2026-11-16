import { useWorkflowStore } from '../store/workflow'

interface InspectorProps {
  models: string[]
}

const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500'

const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500'

export function Inspector({ models }: InspectorProps) {
  const node = useWorkflowStore((state) =>
    state.nodes.find((item) => item.id === state.selectedId)
  )
  const updateConfig = useWorkflowStore((state) => state.updateConfig)
  const updateLabel = useWorkflowStore((state) => state.updateLabel)

  if (!node) {
    return (
      <aside className="w-72 shrink-0 border-l border-slate-800 bg-slate-950 p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Inspector
        </h2>
        <p className="text-xs text-slate-500">Select a node to edit its settings.</p>
      </aside>
    )
  }

  const config = node.data.config
  const kind = node.data.kind
  const modelOptions = config.model && !models.includes(config.model)
    ? [config.model, ...models]
    : models

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-slate-800 bg-slate-950 p-3">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Inspector
      </h2>

      <div className="mb-3">
        <label className={labelClass} htmlFor="node-label">
          Label
        </label>
        <input
          id="node-label"
          className={inputClass}
          value={node.data.label}
          onChange={(event) => updateLabel(node.id, event.target.value)}
        />
      </div>

      <div className="mb-3 text-[11px] text-slate-500">
        Type: <span className="text-slate-300">{kind}</span>
      </div>

      {kind === 'agent' && (
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelClass} htmlFor="agent-model">
              Model
            </label>
            <select
              id="agent-model"
              className={inputClass}
              value={config.model ?? 'llama3.2'}
              onChange={(event) => updateConfig(node.id, { model: event.target.value })}
            >
              {modelOptions.length === 0 && (
                <option value={config.model ?? 'llama3.2'}>{config.model ?? 'llama3.2'}</option>
              )}
              {modelOptions.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="agent-system">
              System prompt
            </label>
            <textarea
              id="agent-system"
              rows={4}
              className={inputClass}
              value={config.systemPrompt ?? ''}
              onChange={(event) => updateConfig(node.id, { systemPrompt: event.target.value })}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="agent-prompt">
              Prompt
            </label>
            <textarea
              id="agent-prompt"
              rows={5}
              className={inputClass}
              value={config.prompt ?? ''}
              onChange={(event) => updateConfig(node.id, { prompt: event.target.value })}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Insert previous outputs with {'{{node-id}}'} or {'{{node-id.json}}'}.
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="agent-temp">
              Temperature
            </label>
            <input
              id="agent-temp"
              type="number"
              min={0}
              max={2}
              step={0.1}
              className={inputClass}
              value={config.temperature ?? 0.7}
              onChange={(event) =>
                updateConfig(node.id, { temperature: Number(event.target.value) })
              }
            />
          </div>
        </div>
      )}

      {kind === 'tool' && (
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelClass} htmlFor="tool-method">
              Method
            </label>
            <select
              id="tool-method"
              className={inputClass}
              value={config.method ?? 'GET'}
              onChange={(event) => updateConfig(node.id, { method: event.target.value })}
            >
              {['GET', 'POST', 'PUT', 'DELETE'].map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="tool-url">
              URL
            </label>
            <input
              id="tool-url"
              className={inputClass}
              value={config.url ?? ''}
              onChange={(event) => updateConfig(node.id, { url: event.target.value })}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="tool-headers">
              Headers (JSON)
            </label>
            <textarea
              id="tool-headers"
              rows={3}
              className={inputClass}
              value={config.headers ?? ''}
              onChange={(event) => updateConfig(node.id, { headers: event.target.value })}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="tool-body">
              Body
            </label>
            <textarea
              id="tool-body"
              rows={4}
              className={inputClass}
              value={config.body ?? ''}
              onChange={(event) => updateConfig(node.id, { body: event.target.value })}
            />
          </div>
        </div>
      )}

      {(kind === 'trigger' || kind === 'end') && (
        <p className="text-xs text-slate-500">
          {kind === 'trigger'
            ? 'The trigger starts the run. Connect it to the first step.'
            : 'The end node collects the outputs of all previous nodes.'}
        </p>
      )}
    </aside>
  )
}
