import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fullName, phoneNumber, bio, country, birthDate } = await req.json()
    const userId = session.userId as string

    // Update profiles table
    const { error } = await db
      .from('profiles')
      .update({
        full_name: fullName,
        phone_number: phoneNumber,
        bio: bio,
        country: country,
        birth_date: birthDate
      })
      .eq('id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
