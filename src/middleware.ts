import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if user is in guest mode
  const isGuest = request.cookies.get('guestMode')?.value === 'true'
  
  // Allow guest access to app routes
  if (isGuest && pathname.startsWith('/app')) {
    return NextResponse.next()
  }
  
  // Protect app routes - require either auth or guest mode
  if (pathname.startsWith('/app') && !isGuest) {
    // Check for session cookie (Supabase)
    const hasSession = request.cookies.get('sb-access-token') || request.cookies.get('sb-auth-token')
    
    if (!hasSession) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}