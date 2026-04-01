import { getSession } from '@/lib/jwt'
import { db } from '@/lib/db'
import { generateApiKey } from '@/lib/api-keys'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getSession()

  if (!session || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.userId as string

  const { data: keys, error } = await db
    .from('user_api_keys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ keys })
}

export async function POST() {
  const session = await getSession()

  if (!session || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.userId as string

  try {
    const apiKey = await generateApiKey(userId)
    return NextResponse.json({ apiKey })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await getSession()

  if (!session || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.userId as string
  const { id } = await req.json()

  const { error } = await db
    .from('user_api_keys')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

