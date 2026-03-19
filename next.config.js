/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@mysten/sui.js']
  }
}

module.exports = nextConfig