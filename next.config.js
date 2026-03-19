/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@mysten/sui.js'],
    after: true
  }
}

module.exports = nextConfig