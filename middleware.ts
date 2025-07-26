import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isHTTPSUsageEnabled } from './lib/constants';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Allow mock API endpoints without authentication
  if (pathname.startsWith('/mock/api/')) {
    return NextResponse.next();
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: isHTTPSUsageEnabled,
      cookieName: 'authjs.session-token',
    });

    if (!token) {
      // Redirect unauthenticated users to login page instead of creating guest session
      if (!['/login', '/register'].includes(pathname)) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.next();
    }

    // Redirect authenticated users away from login/register pages
    if (token && ['/login', '/register'].includes(pathname)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.log(`[MIDDLEWARE] Error getting token:`, error);
    // Redirect to login page on error instead of creating guest session
    if (!['/login', '/register'].includes(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/',
    '/chat/:id',
    '/api/:path*',
    '/login',
    '/register',

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt, manifest.json (metadata files)
     * - apple-touch-icon (apple touch icons)
     * - web-app-manifest (PWA manifest icons)
     * - images/ (image assets)
     * - All other common static file extensions
     */
    '/((?!_next/static|_next/image|favicon|apple-touch-icon|web-app-manifest|sitemap.xml|robots.txt|manifest.json|images/).*)',
  ],
};
