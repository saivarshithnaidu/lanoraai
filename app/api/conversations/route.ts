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

    const { data, error } = await db
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ conversations: data || [] })
  } catch (error: any) {
    console.error('Conversations fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title = 'New Conversation' } = await req.json()
    const userId = session.userId as string

    const { data, error } = await db
      .from('conversations')
      .insert({ user_id: userId, title })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ conversation: data })
  } catch (error: any) {
    console.error('Conversation create error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
