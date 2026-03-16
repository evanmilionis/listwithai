import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/auth/', '/success'],
      },
    ],
    sitemap: 'https://listwithai.io/sitemap.xml',
  };
}
