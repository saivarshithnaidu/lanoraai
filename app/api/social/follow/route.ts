import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId } = await req.json()
    const currentUserId = session.userId as string

    if (!targetUserId) {
        return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 })
    }

    // 1. Check if target user is private
    const { data: targetProfile, error: pError } = await db
        .from('profiles')
        .select('is_private')
        .eq('id', targetUserId)
        .single()

    if (pError || !targetProfile) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const status = targetProfile.is_private ? 'pending' : 'accepted'

    // 2. Insert into follows table
    const { error: fError } = await db
        .from('follows')
        .upsert({
            follower_id: currentUserId,
            following_id: targetUserId,
            status
        }, {
            onConflict: 'follower_id,following_id'
        })
    
    if (fError) throw fError

    return NextResponse.json({ 
        success: true, 
        status, 
        message: status === 'pending' ? 'Follow request sent' : 'Following' 
    })

  } catch (error: any) {
    console.error('Follow error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
    try {
        const session = await getSession()
        if (!session || !session.userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    
        const { searchParams } = new URL(req.url)
        const targetUserId = searchParams.get('userId')
        const currentUserId = session.userId as string
    
        if (!targetUserId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }
    
        const { error: fError } = await db
            .from('follows')
            .delete()
            .eq('follower_id', currentUserId)
            .eq('following_id', targetUserId)
        
        if (fError) throw fError
    
        return NextResponse.json({ success: true })
        
    } catch (error: any) {
        console.error('Unfollow error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
