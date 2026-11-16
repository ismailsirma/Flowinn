import { describe, expect, it } from 'vitest'
import { renderTemplate, topologicalOrder, validateWorkflow } from './engine'
import type { NodeConfig, NodeKind, Workflow } from '../shared/types'

function node(id: string, kind: NodeKind, label: string, config: NodeConfig = {}) {
  return { id, kind, label, config, position: { x: 0, y: 0 } }
}

function workflow(nodes: Workflow['nodes'], edges: Workflow['edges'] = []): Workflow {
  return {
    id: 'test',
    name: 'Test',
    nodes,
    edges,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

describe('renderTemplate', () => {
  it('replaces node text and json references', () => {
    const context = {
      agent: { text: 'hello', output: { value: 42 } }
    }
    expect(renderTemplate('Say {{agent}}', context)).toBe('Say hello')
    expect(renderTemplate('Data {{agent.json}}', context)).toBe('Data {"value":42}')
  })

  it('leaves unknown references empty', () => {
    expect(renderTemplate('{{missing}}', {})).toBe('')
  })
})

describe('topologicalOrder', () => {
  it('orders nodes by dependencies', () => {
    const graph = workflow(
      [node('trigger', 'trigger', 'Trigger'), node('agent', 'agent', 'Agent'), node('end', 'end', 'End')],
      [
        { id: 'e1', source: 'trigger', target: 'agent' },
        { id: 'e2', source: 'agent', target: 'end' }
      ]
    )
    expect(topologicalOrder(graph).map((item) => item.id)).toEqual(['trigger', 'agent', 'end'])
  })

  it('throws on cycles', () => {
    const graph = workflow(
      [node('a', 'agent', 'A'), node('b', 'agent', 'B')],
      [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'a' }
      ]
    )
    expect(() => topologicalOrder(graph)).toThrow(/cycle/i)
  })
})

describe('validateWorkflow', () => {
  it('requires exactly one trigger', () => {
    const graph = workflow([node('agent', 'agent', 'Agent')])
    expect(() => validateWorkflow(graph)).toThrow(/one trigger/i)
  })

  it('rejects unreachable nodes', () => {
    const graph = workflow(
      [node('trigger', 'trigger', 'Trigger'), node('agent', 'agent', 'Agent'), node('end', 'end', 'End')],
      [{ id: 'e1', source: 'trigger', target: 'agent' }]
    )
    expect(() => validateWorkflow(graph)).toThrow(/not connected/i)
  })

  it('accepts a connected workflow', () => {
    const graph = workflow(
      [node('trigger', 'trigger', 'Trigger'), node('end', 'end', 'End')],
      [{ id: 'e1', source: 'trigger', target: 'end' }]
    )
    expect(() => validateWorkflow(graph)).not.toThrow()
  })
})
