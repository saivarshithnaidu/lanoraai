import { NextResponse, NextRequest } from 'next/server'
import * as jose from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_dev_only')

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  const { pathname } = request.nextUrl

  // Define public vs protected routes
  const isPublicRoute = pathname === '/' || pathname === '/login' || pathname.startsWith('/api/auth')
  const isProtectedRoute = pathname.startsWith('/chat') || 
                           pathname.startsWith('/onboarding') || 
                           pathname.startsWith('/admin') ||
                           pathname.startsWith('/profile') ||
                           pathname === '/people' || 
                           pathname === '/messages'

  // 1. Strict Authentication Check
  if (!token && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    
    // Preserve the original destination for redirect after login
    if (pathname !== '/') url.searchParams.set('redirect', pathname)
    
    return NextResponse.redirect(url)
  }

  // 1.5. Catch-all for any non-public route without token
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
      const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@lanora.ai').toLowerCase().trim()
      const userEmail = (payload.email as string || '').toLowerCase().trim()
      const userRole = (payload.role as string || '').toLowerCase().trim()

      // Role check takes precedence, then email fallback
      const isAdmin = userRole === 'admin' || (userEmail === ADMIN_EMAIL && userEmail !== '');
      const isBlocked = payload.is_blocked === true

      if (isBlocked && pathname !== '/login') {
         const url = request.nextUrl.clone()
         url.pathname = '/login'
         url.searchParams.set('error', 'blocked')
         const response = NextResponse.redirect(url)
         response.cookies.delete('auth_token')
         return response
      }

      if (pathname.startsWith('/admin') && !isAdmin) {
          const url = request.nextUrl.clone()
          url.pathname = '/chat'
          return NextResponse.redirect(url)
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
