import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const session = await getSession() as { role?: string; email?: string } | null
    const isAdmin = session?.role === 'admin' || session?.email === (process.env.ADMIN_EMAIL || 'admin@lanora.ai')

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') || 'souls'
    const search = searchParams.get('search') || ''

    let data: unknown = []
    let counts: { totalSouls: number; liveMessages: number; allMsgs: number } = { totalSouls: 0, liveMessages: 0, allMsgs: 0 }

    // Fetch Stats
    const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    const { count: mCount } = await supabase.from('chat_logs').select('*', { count: 'exact', head: true })
    const { count: allMCount } = await supabase.from('messages').select('*', { count: 'exact', head: true })
    counts = { totalSouls: uCount || 0, liveMessages: mCount || 0, allMsgs: allMCount || 0 }

    if (tab === 'souls') {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`)
      }
      const { data: users } = await query.limit(100)
      data = users
    } else if (tab === 'audit') {
      const { data: logs } = await supabase
        .from('chat_logs')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(50)
      data = logs
    } else if (tab === 'messages') {
      const { data: messages } = await supabase
        .from('messages')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(100)
      data = messages
    }

    return NextResponse.json({ data, counts })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Admin API error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(request: Request) {
    try {
        const session = await getSession() as { role?: string; email?: string } | null
        const isAdmin = session?.role === 'admin' || session?.email === (process.env.ADMIN_EMAIL || 'admin@lanora.ai')

        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { userId, action, value } = await request.json()
        const supabase = await createAdminClient()

        if (action === 'block') {
            await supabase.from('profiles').update({ is_blocked: true }).eq('id', userId)
        } else if (action === 'unblock') {
            await supabase.from('profiles').update({ is_blocked: false }).eq('id', userId)
        } else if (action === 'reset') {
            await supabase.from('profiles').update({ credits: 100 }).eq('id', userId)
        } else if (action === 'update_credits') {
            await supabase.from('profiles').update({ credits: value }).eq('id', userId)
        } else if (action === 'update_phone') {
            await supabase.from('profiles').update({ phone_number: value }).eq('id', userId)
        }

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}




