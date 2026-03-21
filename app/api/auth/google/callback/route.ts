import { OAuth2Client } from 'google-auth-library'
import { db } from '@/lib/db'
import { signJWT } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('Google OAuth Error:', error)
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`)
  }

  if (!code) {
    console.error('No authorization code found in callback URL')
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`)
  }

  try {
    // 1. Exchange code for tokens
    console.log('Attempting to exchange code for tokens...')
    const { tokens } = await client.getToken(code)
    console.log('Token response received:', JSON.stringify(tokens, null, 2))
    
    const idToken = tokens.id_token

    if (!idToken) {
      throw new Error('No id_token received')
    }

    // 2. Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()

    if (!payload || !payload.email) {
      throw new Error('Invalid token payload')
    }

    const { email, name, picture } = payload

    // 3. Upsert user in profiles table
    // Fetch user by email first
    const { data: existingUser } = await db
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    let user = existingUser

    if (!user) {
      // Create new user with 100 credits
      const { data: newUser, error: createError } = await db
        .from('profiles')
        .insert({
          email,
          name,
          credits: 100
        })
        .select()
        .single()
      
      if (createError) throw createError
      user = newUser
    }

    // 4. Create manual JWT
    const authToken = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      picture
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

    return NextResponse.redirect(`${origin}/chat`)

  } catch (error: any) {
    console.error('Manual OAuth error:', error)
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`)
  }
}
