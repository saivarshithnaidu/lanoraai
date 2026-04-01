import { db } from '@/lib/db'
import { signJWT } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { email, password, full_name } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // 1. Check if user already exists
    const { data: existingUser } = await db
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // 2. Hash password
    const password_hash = await bcrypt.hash(password, 10)

    // 3. Create user in profiles
    const { data: user, error: createError } = await db
      .from('profiles')
      .insert({
        email,
        full_name: full_name || email.split('@')[0],
        password_hash,
        credits: 100,
        role: email === (process.env.ADMIN_EMAIL || 'admin@lanora.ai') ? 'admin' : 'user'
      })
      .select()
      .single()

    if (createError) throw createError

    // 4. Create manual JWT
    const authToken = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role
    })

    // 5. Store in HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return NextResponse.json({ success: true, user })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Signup Error]:', errorMessage)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
