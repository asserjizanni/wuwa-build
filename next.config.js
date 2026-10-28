const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sharp'],
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingExcludes: {
    '*': [
      '**/.next/cache/**',
      '**/node_modules/@swc/core*/**',
      '**/node_modules/@esbuild/**',
      // Exclude Windows temp paths from tracing
      '**/AppData/Local/Temp/**',
      '**/Temp/**',
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      {
        source: '/storage/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/storage/:path*',
        destination: '/api/storage/:path*',
      },
      {
        source: '/ar/characters/:slug*',
        destination: '/characters/:slug*',
      },
      {
        source: '/ar/weapons/:slug*',
        destination: '/weapons/:slug*',
      },
      {
        source: '/ar/echoes/:slug*',
        destination: '/echoes/:slug*',
      },
      {
        source: '/ar/:path*',
        destination: '/:path*',
      },
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
