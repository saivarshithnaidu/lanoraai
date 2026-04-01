import { createAdminClient } from '@/lib/supabase/server'

interface ApiKey {
  id: string
  provider: 'openrouter' | 'groq' | 'openai'
  api_key: string
  status: 'active' | 'inactive' | 'failed'
}

export async function getNextApiKey(preferredProvider?: string): Promise<ApiKey | null> {
  const supabase = await createAdminClient()

  // Fetch all active keys sorted by usage
  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('status', 'active')
    .order('usage_count', { ascending: true })

  if (error || !keys || keys.length === 0) {
    return null
  }

  // If a provider is preferred, try to find it first
  if (preferredProvider) {
    const preferredKey = keys.find(k => k.provider === preferredProvider)
    if (preferredKey) return preferredKey as ApiKey
  }

  // Otherwise, return the least-used active key
  return keys[0] as ApiKey
}

export async function markKeyAsFailed(id: string) {
  const supabase = await createAdminClient()
  await supabase
    .from('api_keys')
    .update({ status: 'failed' })
    .eq('id', id)
}

export async function incrementKeyUsage(id: string) {
  const supabase = await createAdminClient()
  // RPC call for atomic increment
  await supabase.rpc('increment_api_key_usage', { key_id: id })
}

export async function logToDB(userId: string | null, type: 'chat'|'error'|'payment'|'api', message: string, metadata: Record<string, unknown> = {}) {
    // Need a service role client to log even if RLS is strict
    const supabase = await createAdminClient()
    await supabase.from('logs').insert({
        user_id: userId,
        type,
        message,
        metadata
    })
}

export async function logUsage(userId: string, tokens: number, provider: string, model: string) {
    const supabase = await createAdminClient()
    await supabase.from('usage_logs').insert({
        user_id: userId,
        tokens_used: tokens,
        provider,
        model
    })
}

export async function logChat(userId: string, message: string, response: string) {
    const supabase = await createAdminClient()
    await supabase.from('chat_logs').insert({
        user_id: userId,
        message,
        response,
    })
}

export async function logError(message: string, stack?: string) {
    const supabase = await createAdminClient()
    await supabase.from('error_logs').insert({
        message,
        stack: stack || null,
        timestamp: new Date().toISOString()
    })
}
