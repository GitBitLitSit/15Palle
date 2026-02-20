/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/v1/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400,
  },
}

export default nextConfig
