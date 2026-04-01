import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { target_id, reason, type } = await req.json()
    const reporter_id = session.userId as string

    const { data: report, error } = await db
      .from('reports')
      .insert({
        reporter_id,
        target_id,
        reason,
        type
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ report })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

