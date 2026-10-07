import Anthropic from '@anthropic-ai/sdk'
import { getSecret, secretsVersion } from './config'

let cached: { v: number; key: string; client: Anthropic } | null = null

export function getAnthropic(): Anthropic {
  const key = getSecret('ANTHROPIC_API_KEY')
  if (!key) throw new Error('ANTHROPIC_API_KEY no configurada')
  const v = secretsVersion()
  if (!cached || cached.v !== v || cached.key !== key) cached = { v, key, client: new Anthropic({ apiKey: key }) }
  return cached.client
}
