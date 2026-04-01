import { db } from './db'
import crypto from 'crypto'

export async function generateApiKey(userId: string): Promise<string> {
  const apiKey = `ln_${crypto.randomBytes(32).toString('hex')}`
  
  const { error } = await db
    .from('user_api_keys')
    .insert({
      user_id: userId,
      api_key: apiKey,
      is_active: true
    })

  if (error) {
    throw new Error(`Failed to generate API Key: ${error.message}`)
  }

  return apiKey
}

export async function validateApiKey(apiKey: string): Promise<string | null> {
  if (!apiKey || !apiKey.startsWith('ln_')) {
    return null
  }

  const { data, error } = await db
    .from('user_api_keys')
    .select('user_id, is_active')
    .eq('api_key', apiKey)
    .single()

  if (error || !data || !data.is_active) {
    return null
  }

  // Update last_used_at timestamp
  await db
    .from('user_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('api_key', apiKey)

  return data.user_id
}
