const baseUrl = () => process.env.OLLAMA_URL ?? 'http://localhost:11434'

export async function listModels(): Promise<string[]> {
  const response = await fetch(`${baseUrl()}/api/tags`)
  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}`)
  }
  const payload = (await response.json()) as { models?: Array<{ name: string }> }
  return (payload.models ?? []).map((model) => model.name)
}

export async function chatStream(
  model: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  onToken: (token: string) => void,
  options: { temperature?: number; signal?: AbortSignal } = {}
): Promise<string> {
  const response = await fetch(`${baseUrl()}/api/chat`, {
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
    throw new Error(`Ollama returned HTTP ${response.status}: ${detail.slice(0, 200)}`)
  }

  if (!response.body) {
    throw new Error('Ollama returned an empty response body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      let chunk: { message?: { content?: string }; done?: boolean; error?: string }
      try {
        chunk = JSON.parse(trimmed)
      } catch {
        continue
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
  }

  return text
}
