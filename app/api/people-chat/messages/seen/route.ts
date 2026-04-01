import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversation_id } = await req.json()
    const currentUserId = session.userId as string

    // Mark all messages in this conversation sent by OTHER user as seen
    const { error } = await db
      .from('chat_messages')
      .update({ 
        is_seen: true, 
        seen_at: new Date().toISOString() 
      })
      .eq('conversation_id', conversation_id)
      .neq('sender_id', currentUserId)
      .eq('is_seen', false)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
console.error('Seen status error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}



