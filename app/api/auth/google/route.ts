import { OAuth2Client } from 'google-auth-library'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)

  // Redirect to this path after user approves in Google
  const redirectUri = `${origin}/api/auth/callback/google`

  const oauthClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  )

  const authorizeUrl = oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
  })

  return NextResponse.redirect(authorizeUrl)
}
