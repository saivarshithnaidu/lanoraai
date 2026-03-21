import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const session = await getSession()

    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId as string

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversation_id')

    let query = db
      .from('messages')
      .select('*')
      .eq('user_id', userId)
    
    if (conversationId) {
      query = query.eq('conversation_id', conversationId)
    } else {
      // If no conversationId, maybe fetch latest single thread (legacy)
      query = query.is('conversation_id', null)
    }

    const { data, error } = await query.order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ messages: data || [] })

  } catch (error: any) {
    console.error('Messages fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
