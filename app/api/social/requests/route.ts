import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

// Fetch incoming pending requests
export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserId = session.userId as string

    // Fetch incoming follows where status is pending
    const { data: requests, error: rError } = await db
      .from('follows')
      .select(`
        id,
        follower_id,
        status,
        created_at,
        profiles!follower_id (
          id,
          name,
          avatar_url
        )
      `)
      .eq('following_id', currentUserId)
      .eq('status', 'pending')

    if (rError) throw rError

    return NextResponse.json({ success: true, requests: requests || [] })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
console.error('Fetch requests error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// Handle Accept/Reject action
export async function POST(req: Request) {
  try {
    const session = await getSession()
    const { requestId, action } = await req.json() // action: 'accept' | 'reject'
    const currentUserId = session?.userId as string

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Missing requestId or action' }, { status: 400 })
    }

    if (action === 'accept') {
      const { error: fError } = await db
        .from('follows')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('following_id', currentUserId) // Safety check

      if (fError) throw fError
      return NextResponse.json({ success: true, message: 'Request accepted ✅' })
    } else if (action === 'reject') {
      const { error: fError } = await db
        .from('follows')
        .delete()
        .eq('id', requestId)
        .eq('following_id', currentUserId)

      if (fError) throw fError
      return NextResponse.json({ success: true, message: 'Request rejected' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
console.error('Request action error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}



