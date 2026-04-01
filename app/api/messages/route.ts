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
    
    // Non-admins see only non-deleted messages
    if (session.role !== 'admin') {
      query = query.eq('is_deleted', false)
    }
    
    if (conversationId) {
      query = query.eq('conversation_id', conversationId)
    } else {
      query = query.is('conversation_id', null)
    }

    const { data, error } = await query.order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ messages: data || [] })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
console.error('Messages fetch error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}



