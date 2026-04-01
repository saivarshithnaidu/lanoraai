import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: posts, error } = await db
      .from('posts')
      .select('*, profiles(name, avatar_url, country)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ posts: posts || [] })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, image_url } = await req.json()
    const userId = session.userId as string

    const { data: post, error } = await db
      .from('posts')
      .insert({
        user_id: userId,
        content,
        image_url
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ post })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}



