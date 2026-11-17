import type { ProviderSettings } from '../shared/types'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function providerBaseUrl(settings: ProviderSettings): string {
  const host = settings.host.trim()
  if (!host) {
    throw new Error('Provider host is empty')
  }

  const withScheme = /^https?:\/\//i.test(host) ? host : `http://${host}`

  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    throw new Error('Provider host is invalid')
  }

  url.port = String(settings.port)
  return url.toString().replace(/\/$/, '')
}

export async function listModels(settings: ProviderSettings): Promise<string[]> {
  const base = providerBaseUrl(settings)
  const endpoint = settings.kind === 'ollama' ? `${base}/api/tags` : `${base}/v1/models`

  const response = await fetch(endpoint)
  if (!response.ok) {
    throw new Error(`Provider returned HTTP ${response.status}`)
  }

  if (settings.kind === 'ollama') {
    const payload = (await response.json()) as { models?: Array<{ name: string }> }
    return (payload.models ?? []).map((model) => model.name)
  }

  const payload = (await response.json()) as { data?: Array<{ id: string }> }
  return (payload.data ?? []).map((model) => model.id)
}

export async function chatStream(
  settings: ProviderSettings,
  model: string,
  messages: ChatMessage[],
  onToken: (token: string) => void,
  options: { temperature?: number; signal?: AbortSignal } = {}
): Promise<string> {
  return settings.kind === 'ollama'
    ? ollamaChat(settings, model, messages, onToken, options)
    : openAiChat(settings, model, messages, onToken, options)
}

async function ollamaChat(
  settings: ProviderSettings,
  model: string,
  messages: ChatMessage[],
  onToken: (token: string) => void,
  options: { temperature?: number; signal?: AbortSignal }
): Promise<string> {
  const response = await fetch(`${providerBaseUrl(settings)}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: { temperature: options.temperature ?? 0.7 }
    }),
    signal: options.signal
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Provider returned HTTP ${response.status}: ${detail.slice(0, 200)}`)
  }

  if (!response.body) {
    throw new Error('Provider returned an empty response body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''

  const consume = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed) return
    let chunk: { message?: { content?: string }; error?: string }
    try {
      chunk = JSON.parse(trimmed)
    } catch {
      return
    }
    if (chunk.error) {
      throw new Error(chunk.error)
    }
    const content = chunk.message?.content
    if (content) {
      text += content
      onToken(content)
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) consume(line)
  }
  if (buffer) consume(buffer)

  return text
}

async function openAiChat(
  settings: ProviderSettings,
  model: string,
  messages: ChatMessage[],
  onToken: (token: string) => void,
  options: { temperature?: number; signal?: AbortSignal }
): Promise<string> {
  const response = await fetch(`${providerBaseUrl(settings)}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7
    }),
    signal: options.signal
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Provider returned HTTP ${response.status}: ${detail.slice(0, 200)}`)
  }

  if (!response.body) {
    throw new Error('Provider returned an empty response body')
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('text/event-stream')) {
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = payload.choices?.[0]?.message?.content ?? ''
    if (content) onToken(content)
    return content
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''

  const consume = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const data = trimmed.slice(5).trim()
    if (!data || data === '[DONE]') return
    let chunk: {
      choices?: Array<{ delta?: { content?: string } }>
      error?: { message?: string }
    }
    try {
      chunk = JSON.parse(data)
    } catch {
      return
    }
    if (chunk.error) {
      throw new Error(chunk.error.message ?? 'Provider returned an error')
    }
    const content = chunk.choices?.[0]?.delta?.content
    if (content) {
      text += content
      onToken(content)
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) consume(line)
  }
  if (buffer) consume(buffer)

  return text
}
