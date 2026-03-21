import { createAdminClient } from './lib/supabase/server'

async function checkKeys() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.from('api_keys').select('*')
  console.log('API Keys in table:', data)
  if (error) console.error('Error fetching keys:', error)
}

checkKeys()
