import { Handle, Position, type NodeProps, type NodeTypes } from '@xyflow/react'
import type { NodeStatus } from '@shared/types'
import type { FlowData, FlowNode } from '../../store/workflow'

function StatusDot({ status }: { status: NodeStatus }) {
  const color =
    status === 'running'
      ? 'bg-amber-400 animate-pulse'
      : status === 'done'
        ? 'bg-emerald-400'
        : status === 'error'
          ? 'bg-rose-500'
          : 'bg-slate-600'
  return <span className={`h-2 w-2 rounded-full ${color}`} />
}

interface CardProps {
  data: FlowData
  selected: boolean
  accent: string
  subtitle: string
  hasTarget?: boolean
  hasSource?: boolean
}

function Card({
  data,
  selected,
  accent,
  subtitle,
  hasTarget = true,
  hasSource = true
}: CardProps) {
  return (
    <div
      className={`relative w-60 rounded-xl border bg-slate-900/95 px-3 py-2 shadow-xl transition-colors ${
        selected ? 'border-sky-400' : 'border-slate-700'
      }`}
    >
      {hasTarget && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2 !w-2 !border-0 !bg-slate-500"
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: accent }}
        >
          {data.kind}
        </span>
        <StatusDot status={data.status} />
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-100">{data.label}</div>
      <div className="mt-1 truncate text-xs text-slate-400">{subtitle}</div>
      {hasSource && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2 !w-2 !border-0 !bg-slate-500"
        />
      )}
    </div>
  )
}

function TriggerNode(props: NodeProps<FlowNode>) {
  return (
    <Card
      data={props.data}
      selected={Boolean(props.selected)}
      accent="#38bdf8"
      subtitle="Starts the workflow"
      hasTarget={false}
    />
  )
}

function AgentNode(props: NodeProps<FlowNode>) {
  const config = props.data.config
  const subtitle = `${config.model ?? 'llama3.2'} · temp ${config.temperature ?? 0.7}`
  return (
    <Card
      data={props.data}
      selected={Boolean(props.selected)}
      accent="#a78bfa"
      subtitle={subtitle}
    />
  )
}

function ToolNode(props: NodeProps<FlowNode>) {
  const config = props.data.config
  const subtitle = `${config.method ?? 'GET'} ${config.url ?? ''}`.trim()
  return (
    <Card
      data={props.data}
      selected={Boolean(props.selected)}
      accent="#34d399"
      subtitle={subtitle}
    />
  )
}

function EndNode(props: NodeProps<FlowNode>) {
  return (
    <Card
      data={props.data}
      selected={Boolean(props.selected)}
      accent="#fb7185"
      subtitle="Collects run output"
      hasSource={false}
    />
  )
}

export const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  tool: ToolNode,
  end: EndNode
} satisfies NodeTypes
