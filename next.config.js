const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Turbopack config: empty object tells Next.js 16 we explicitly accept
  // the webpack config added by next-pwa for PWA support.
  turbopack: {},
};

module.exports = withPWA(nextConfig);
