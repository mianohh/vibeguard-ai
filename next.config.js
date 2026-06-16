/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@mysten/sui.js']
  },
  transpilePackages: ['@mysten/sui']
}

module.exports = nextConfig
