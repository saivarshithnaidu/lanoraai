import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId as string

    const { error } = await db
      .from('messages')
      .delete()
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Clear chat error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
