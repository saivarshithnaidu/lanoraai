import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const session = await getSession()

    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId as string

    // 1. Get user profile
    const { data: profile } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const adminEmail = process.env.ADMIN_EMAIL
    const isAdmin = session.email === adminEmail
    
    // Virtual profile if admin exists but db profile row doesn't
    let finalProfile = profile as any

    if (!profile) {
      if (isAdmin) {
          finalProfile = { email: session.email, name: session.name, credits: 99999, role: 'admin' }
      } else {
          return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      }
    } else if (isAdmin) {
        finalProfile.role = 'admin'
    }

    // 2. Get recent transactions
    const { data: transactions } = await db
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({ profile: finalProfile, transactions: transactions || [], user: session })

  } catch (error: any) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
