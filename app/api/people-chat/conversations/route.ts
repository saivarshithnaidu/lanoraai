import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId as string

    // Fetch conversation IDs where user is a participant
    const { data: participants, error: pError } = await db
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    if (pError) throw pError
    if (!participants || participants.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    const convIds = participants.map(p => p.conversation_id)

    // Fetch all conversation details and OTHER participants for those rooms
    const { data: conversations, error: cError } = await db
      .from('chat_conversations')
      .select(`
        id,
        created_at,
        chat_participants(
          user_id,
          profiles(id, name, email)
        )
      `)
      .in('id', convIds)
      .order('created_at', { ascending: false })

    if (cError) throw cError

    return NextResponse.json({ conversations: conversations || [] })
  } catch (error: any) {
    console.error('Fetch user conversations error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId } = await req.json()
    const currentUserId = session.userId as string

    // 1. Check if conversation already exists between these two
    const { data: existing, error: eError } = await db.rpc('get_conversation_by_participants', {
      user_ids: [currentUserId, targetUserId]
    })

    if (existing && existing.id) {
       return NextResponse.json({ conversation: existing })
    }

    // 2. Create new conversation
    const { data: conv, error: convError } = await db
      .from('chat_conversations')
      .insert({})
      .select()
      .single()

    if (convError) throw convError

    // 3. Add both participants
    await db.from('chat_participants').insert([
      { conversation_id: conv.id, user_id: currentUserId },
      { conversation_id: conv.id, user_id: targetUserId }
    ])

    return NextResponse.json({ conversation: conv })
  } catch (error: any) {
    console.error('Create user conversation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
