import { isHTTPSUsageEnabled, } from '@/lib/constants';
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  cookies: {
    sessionToken: {
      name: 'authjs.session-token',
      options: {
        httpOnly: !isHTTPSUsageEnabled,
        sameSite: 'lax',
        path: '/',
        secure: isHTTPSUsageEnabled,
      },
    },
  },
  callbacks: {},
  trustHost: !isHTTPSUsageEnabled, // Allow localhost in development
  debug: false, // Disable debug mode to reduce console noise
} satisfies NextAuthConfig;
