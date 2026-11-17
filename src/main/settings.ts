import { app } from 'electron'
import { join } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { ProviderSettings } from '../shared/types'

const defaults: ProviderSettings = {
  kind: 'ollama',
  host: 'localhost',
  port: 11434
}

const settingsFile = () => join(app.getPath('userData'), 'settings.json')

function normalize(input: Partial<ProviderSettings>): ProviderSettings {
  const kind = input.kind === 'openai' ? 'openai' : 'ollama'
  const host = (input.host ?? defaults.host).trim() || defaults.host
  const port = Number(input.port ?? defaults.port)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Port must be an integer between 1 and 65535')
  }

  return { kind, host, port }
}

export async function getProviderSettings(): Promise<ProviderSettings> {
  try {
    const raw = await readFile(settingsFile(), 'utf8')
    return normalize(JSON.parse(raw) as Partial<ProviderSettings>)
  } catch {
    return { ...defaults }
  }
}

export async function saveProviderSettings(input: ProviderSettings): Promise<ProviderSettings> {
  const settings = normalize(input)
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(settingsFile(), JSON.stringify(settings, null, 2), 'utf8')
  return settings
}
