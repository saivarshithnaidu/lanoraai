import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserId = session.userId as string

    // 1. Fetch users
    const { data: users, error } = await db
      .from('profiles')
      .select('id, name, email, bio, last_seen, avatar_url, country, interests, birth_date, is_private')
      .neq('id', currentUserId)
      .order('last_seen', { ascending: false })
      .limit(50)

    if (error) throw error

    // 2. Fetch following status
    const { data: follows, error: fError } = await db
      .from('follows')
      .select('following_id, status')
      .eq('follower_id', currentUserId)

    if (fError) throw fError

    // 3. Map following status to users
    const usersWithFollow = users?.map(u => ({
      ...u,
      followingStatus: follows?.find(f => f.following_id === u.id)?.status || null,
      isFollowing: follows?.some(f => f.following_id === u.id && f.status === 'accepted')
    }))

    return NextResponse.json({ users: usersWithFollow || [] })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
console.error('Fetch users error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}



