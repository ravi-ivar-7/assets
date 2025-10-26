import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compiler: {
    // Enable SWC minification
    removeConsole: process.env.NODE_ENV === 'production',
  },
  output: 'standalone',
  images: {
    unoptimized: true, // Disable Image Optimization API
  },
  // Add any other necessary configurations here
};

export default nextConfig;
