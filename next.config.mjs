/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  // Self-hosted container runtime: emit `.next/standalone/server.js` with only
  // the traced runtime deps. See Dockerfile.
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com`,
              "worker-src 'self'",
              "manifest-src 'self'",
              "script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com",
              "connect-src 'self' https:",
              // Playback may be served through provider embed iframes; the
              // active provider is an environment decision (NOVA_API_URL or a
              // custom provider), so the frame origin cannot be a build-time
              // constant. Restrict this list to known origins in locked-down
              // deployments.
              "frame-src 'self' https:",
              "img-src 'self' data: https: blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/kdrama', destination: '/category/kdrama', permanent: false },
      { source: '/k-drama', destination: '/category/kdrama', permanent: false },
      { source: '/cdrama', destination: '/category/cdrama', permanent: false },
      { source: '/c-drama', destination: '/category/cdrama', permanent: false },
      { source: '/bollywood', destination: '/category/bollywood', permanent: false },
      { source: '/hindi-serials', destination: '/category/hindi-serials', permanent: false },
      { source: '/hindi-web-series', destination: '/category/hindi-web-series', permanent: false },
      { source: '/cartoons', destination: '/category/cartoons', permanent: false },
      { source: '/hollywood', destination: '/category/hollywood', permanent: false },
    ];
  },
};

export default nextConfig;
