import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

// Handle Follow/Unfollow/Request
export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId } = await req.json()
    const currentUserId = session.userId as string

    // Check if a request already exists
    const { data: existing, error: eError } = await db
      .from('follows')
      .select('status')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .single()

    if (existing) {
      return NextResponse.json({ success: true, status: existing.status, message: 'Request already exists' })
    }

    // Create a NEW follow request (pending by default)
    const { error: fError } = await db
      .from('follows')
      .insert({
        follower_id: currentUserId,
        following_id: targetUserId,
        status: 'pending'
      })

    if (fError) throw fError

    return NextResponse.json({ success: true, status: 'pending', message: 'Follow request sent ⏳' })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
console.error('Follow request error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// Fetch outgoing follow status (to show states in Discover)
export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserId = session.userId as string

    // Fetch all follows related to user
    const { data: follows, error: fError } = await db
      .from('follows')
      .select('follower_id, following_id, status')
      .or(`follower_id.eq.${currentUserId},following_id.eq.${currentUserId}`)

    if (fError) throw fError

    return NextResponse.json({ success: true, follows: follows || [] })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}



