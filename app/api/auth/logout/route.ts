import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/jwt'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  const session = await getSession()
  if (session) {
    await db.from('profiles').update({ last_logout: new Date().toISOString() }).eq('id', session.userId)
  }

  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
  
  return NextResponse.json({ success: true })
}
