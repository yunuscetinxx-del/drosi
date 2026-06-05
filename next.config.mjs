/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress the X-Powered-By: Next.js header for security
  poweredByHeader: false,

  // Enable gzip/brotli compression for all responses
  compress: true,

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    // Enable Next.js image optimisation with modern formats
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
  },

  allowedDevOrigins: [
    'vm-7ozibpmxnhro217mcbudnbyi.vusercontent.net',
    'localhost',
    '127.0.0.1',
  ],

  async headers() {
    return [
      {
        // Cache immutable static assets (JS/CSS chunks, fonts, images) for 1 hour
        // with stale-while-revalidate so browsers serve stale content while
        // fetching a fresh copy in the background.
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400, immutable',
          },
        ],
      },
      {
        // Cache public folder assets (favicons, images, etc.) for 1 hour with SWR
        source: '/(.+\\.(?:ico|png|jpg|jpeg|svg|gif|webp|avif|woff|woff2|ttf|otf))',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },
}

export default nextConfig
