import { NextResponse, NextRequest } from 'next/server'
import * as jose from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_dev_only')

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  const { pathname } = request.nextUrl

  // Define public routes
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/api/auth') || pathname === '/'

  // 1. If user is on a protected route without a token, redirect to login
  if (!token && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. If user has a token, verify it
  if (token) {
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET)
      
      // Admin route protection
      if (pathname.startsWith('/admin')) {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@lanora.ai'
        if (payload.email !== adminEmail) {
            const url = request.nextUrl.clone()
            url.pathname = '/chat'
            return NextResponse.redirect(url)
        }
      }

      // If already logged in and trying to access login page, redirect to chat
      if (pathname === '/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/chat'
        return NextResponse.redirect(url)
      }
      
    } catch (e) {
      // Token invalid or expired
      if (!isPublicRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        const response = NextResponse.redirect(url)
        response.cookies.delete('auth_token')
        return response
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
