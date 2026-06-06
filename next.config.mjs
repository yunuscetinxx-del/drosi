/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['vm-7ozibpmxnhro217mcbudnbyi.vusercontent.net', 'localhost', '127.0.0.1'],
}

export default nextConfig
