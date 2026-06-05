/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Experimental features for Next.js 14
  experimental: {
    // Server Actions are stable in Next.js 14
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_APP_NAME: "ZIRIUZ",
    NEXT_PUBLIC_APP_VERSION: "2.0.0",
  },

  // Webpack configuration for specific packages
  webpack: (config) => {
    // Required for @react-pdf/renderer
    config.resolve.alias.canvas = false
    config.resolve.alias.encoding = false
    return config
  },
}

export default nextConfig
