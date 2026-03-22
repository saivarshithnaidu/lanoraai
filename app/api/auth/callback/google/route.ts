import { OAuth2Client } from 'google-auth-library'
import { db } from '@/lib/db'
import { signJWT } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Dynamic Redirect URI based on current origin - matching EXACT requirement
  const redirectUri = `${origin}/api/auth/callback/google`

  if (process.env.NODE_ENV === 'development') {
    console.log('[Auth Debug] Callback called with origin:', origin)
    console.log('[Auth Debug] Effective Redirect URI:', redirectUri)
  }

  if (error) {
    if (process.env.NODE_ENV === 'development') console.error('[Auth Debug] Google Error:', error)
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`)
  }

  if (!code) {
    if (process.env.NODE_ENV === 'development') console.error('[Auth Debug] No Code Found')
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`)
  }

  // Create client dynamically to ensure redirectUri matches frontend
  const oauthClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  )

  try {
    // 1. Exchange code for tokens
    if (process.env.NODE_ENV === 'development') console.log('[Auth Debug] Exchanging code...')
    
    // IMPORTANT: getToken requires the SAME redirect_uri used to generate the auth URL
    const { tokens } = await oauthClient.getToken(code)
    
    const idToken = tokens.id_token
    if (!idToken) throw new Error('No id_token received')

    // 2. Verify Google ID token
    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()

    if (!payload || !payload.email) throw new Error('Invalid token payload')

    const { email, name, picture } = payload
    if (process.env.NODE_ENV === 'development') console.log('[Auth Debug] User authenticated:', email)

    // 3. Upsert user in profiles table
    let { data: user } = await db
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (!user) {
      if (process.env.NODE_ENV === 'development') console.log('[Auth Debug] Creating new user profile')
      const { data: newUser, error: createError } = await db
        .from('profiles')
        .insert({
          email,
          name: name || email.split('@')[0],
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

    // Track identity for admin oversight (Capture IP and Login Time)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
    await db.rpc('track_user_login', {
      user_id: user.id,
      user_ip: ip,
      user_device: 'desktop_web'
    })

    return NextResponse.redirect(`${origin}/chat`)

  } catch (error: any) {
    console.error('[Auth Error] Manual OAuth failed:', error.message || error)
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`)
  }
}
