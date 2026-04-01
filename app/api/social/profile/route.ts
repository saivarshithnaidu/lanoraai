import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pathname } = new URL(req.url)
    const targetUserId = pathname.split('/').pop()
    const currentUserId = session.userId as string

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 })
    }

    // 1. Fetch user profile
    const { data: profile, error } = await db
      .from('profiles')
      .select('id, name, bio, avatar_url, country, last_seen, birth_date, age, is_private')
      .eq('id', targetUserId)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 2. Fetch follow info (follower/following status)
    const { data: follows, error: fError } = await db
        .from('follows')
        .select('status')
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
        .single()

    // 3. Count followers/following (using counts instead of all IDs for performance)
    const { count: followersCount } = await db.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId).eq('status', 'accepted')
    const { count: followingCount } = await db.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId).eq('status', 'accepted')

    return NextResponse.json({ 
        profile: {
            ...profile,
            isFollowing: !!follows && follows.status === 'accepted',
            followStatus: follows?.status || null,
            followers: followersCount || 0,
            following: followingCount || 0
        } 
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
console.error('Fetch profile error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}



