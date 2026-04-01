import { db } from '@/lib/db'
import { signJWT } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // 1. Fetch user by email
    const { data: user, error: selectError } = await db
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (selectError || !user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // 2. Check if user is blocked
    if (user.is_blocked) {
      return NextResponse.json({ error: 'User is blocked' }, { status: 403 })
    }

    // 3. Verify password
    if (!user.password_hash) {
      // If user signed up via Google, they might not have a password
      return NextResponse.json({ error: 'Please use Google sign-in for this account' }, { status: 401 })
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Login Error]:', error.message || error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

