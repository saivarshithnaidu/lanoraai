import { createAdminClient } from '@/lib/supabase/server'

interface ApiKey {
  id: string
  provider: 'openrouter' | 'groq' | 'openai'
  api_key: string
  status: 'active' | 'inactive' | 'failed'
}

export async function getNextApiKey(preferredProvider?: string): Promise<ApiKey | null> {
  const supabase = await createAdminClient()

  // Always pick the least-used active key
  let query = supabase
    .from('api_keys')
    .select('*')
    .eq('status', 'active')
    .order('usage_count', { ascending: true })
    .limit(1)

  if (preferredProvider) {
    query = query.eq('provider', preferredProvider)
  }

  const { data: keys, error } = await query

  if (error || !keys || keys.length === 0) {
    // Fallback logic if preferred provider is not available
    if (preferredProvider && preferredProvider !== 'groq') {
        return getNextApiKey('groq')
    }
    return null
  }

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

export async function logToDB(userId: string | null, type: 'chat'|'error'|'payment'|'api', message: string, metadata: any = {}) {
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
