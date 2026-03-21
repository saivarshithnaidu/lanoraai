import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: users, error } = await db
      .from('profiles')
      .select('id, name, email')
      .neq('id', session.userId) // Exclude current user
      .limit(50)

    if (error) throw error

    return NextResponse.json({ users: users || [] })
  } catch (error: any) {
    console.error('Fetch users error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
