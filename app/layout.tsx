import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { ShikiProvider } from '@/components/shiki-provider';
import { SWRConfig } from 'swr';
import { NavigationLoadingProvider } from '@/contexts/navigation-loading-context';
import { NavigationLoadingOverlay } from '@/components/navigation-loading-overlay';
import { NavigationCompleteDetector } from '@/components/navigation-complete-detector';

import './globals.css';
import { SessionProvider } from 'next-auth/react';

export const metadata: Metadata = {
  metadataBase: new URL('https://ai.extra.tools'),
  title: 'All AI Chats',
  description:
    'All AI Chatbot is a versatile AI chatbot platform that supports multiple AI models.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      {
        url: '/apple-touch-icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
      },
      {
        url: '/apple-touch-icon-120x120.png',
        sizes: '120x120',
        type: 'image/png',
      },
      { url: '/apple-touch-icon-76x76.png', sizes: '76x76', type: 'image/png' },
    ],
  },
  appleWebApp: {
    title: 'All AI Chats',
    statusBarStyle: 'black-translucent',
    capable: true,
  },
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no"
        />

        {/* iOS Web App Configuration */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="All AI Chats" />
        <meta name="apple-touch-fullscreen" content="yes" />

        {/* Safari Pinned Tab Icon */}
        <link rel="mask-icon" href="/favicon.svg" color="#1e293b" />

        {/* Apple Touch Icons - placed directly in head */}
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon.png"
          sizes="180x180"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon-152x152.png"
          sizes="152x152"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon-120x120.png"
          sizes="120x120"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon-76x76.png"
          sizes="76x76"
        />

        {/* Splash Screen */}
        <link rel="apple-touch-startup-image" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NavigationLoadingProvider>
            <ShikiProvider>
              <SWRConfig
                value={{
                  refreshInterval: 0,
                  refreshWhenHidden: false,
                  refreshWhenOffline: false,
                  revalidateOnFocus: false,
                  revalidateOnReconnect: false,
                }}
              >
                <Toaster position="top-center" />
                <SessionProvider
                  refetchInterval={0}
                  refetchWhenOffline={false}
                  refetchOnWindowFocus={false}
                >
                  {children}
                  <NavigationLoadingOverlay />
                  <NavigationCompleteDetector />
                </SessionProvider>
              </SWRConfig>
            </ShikiProvider>
          </NavigationLoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
