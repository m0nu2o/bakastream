import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bakastream.dpdns.org';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: [
          'Bytespider',
          'PetalBot',
          'AhrefsBot',
          'SemrushBot',
          'MJ12bot',
          'DotBot',
          'GPTBot',
          'ClaudeBot',
          'CCBot',
          'DataForSeoBot',
        ],
        disallow: ['/'],
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/watch/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
