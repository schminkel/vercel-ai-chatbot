import { signIn } from '@/app/(auth)/auth';
import { isHTTPSUsageEnabled } from '@/lib/constants';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get('redirectUrl') || '/';

  try {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: isHTTPSUsageEnabled,
      cookieName: 'authjs.session-token',
    });

    if (token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  } catch (error) {
    console.log('Error getting token in guest route:', error);
  }

  return signIn('guest', { redirect: true, redirectTo: redirectUrl });
}
