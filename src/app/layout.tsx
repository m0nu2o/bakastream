import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ThemeThemeProvider from '@/components/ThemeThemeProvider';
import BackToTop from '@/components/BackToTop';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bakastream.vercel.app';
const APP_NAME = 'BakaStream';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${APP_NAME} | Watch Movies & TV Shows Online`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    'Discover and stream a vast collection of movies and TV shows online in HD on BakaStream. Browse trending, popular and top-rated titles, build a watchlist and resume watching anywhere.',
  keywords: [
    'movies',
    'tv shows',
    'web series',
    'streaming',
    'watch online',
    'bakastream',
    'anime',
  ],
  robots: { index: true, follow: true },
  referrer: 'origin',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} | Watch Movies & TV Shows Online`,
    description:
      'Browse trending, popular and top-rated movies and TV shows. Build a watchlist and pick up where you left off.',
    images: [{ url: `${SITE_URL}/LOGO.png`, width: 1200, height: 630, alt: APP_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} | Watch Movies & TV Shows Online`,
    description: 'Browse trending, popular and top-rated movies and TV shows.',
    images: [`${SITE_URL}/LOGO.png`],
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0b0b12',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

const GA_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeThemeProvider />
        <Script
          id="ld-json"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: APP_NAME,
              url: SITE_URL,
              description:
                'Discover and stream movies and TV shows online in HD. Browse, watchlist and resume watching.',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </head>
      <body>
        <Navbar />
        {children}
        <Footer />
        <BackToTop />

        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('consent', 'default', {
                  analytics_storage: 'denied',
                  ad_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied',
                  ad_user_data: 'denied',
                  functionality_storage: 'granted',
                  security_storage: 'granted',
                });
                gtag('config', '${GA_ID}', {
                  anonymize_ip: true,
                  respect_dnt: true,
                  allow_google_signals: false,
                  allow_ad_personalization_signals: false,
                });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
