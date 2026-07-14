const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Opts @mediapipe/face_mesh out of Server Components bundling — it has
  // faulty exports that break SSR. The package is only used client-side
  // via dynamic import in the face-detection feature.
  serverExternalPackages: ['@mediapipe/face_mesh'],
  // Turbopack config: empty object tells Next.js 16 we explicitly accept
  // the webpack config added by next-pwa for PWA support.
  turbopack: {},

  // Security Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://smartcaptcha.yandexcloud.net https://smartcaptcha.cloud.yandex.ru https://yastatic.net https://va.vercel-scripts.com https://static.cloudflareinsights.com https://cdn.jsdelivr.net https://unpkg.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://smartcaptcha.yandexcloud.net https://smartcaptcha.cloud.yandex.ru https://yastatic.net https://yandex.ru https://va.vercel-scripts.com https://vitals.vercel-insights.com https://ipapi.co https://cloudflareinsights.com https://cdn.jsdelivr.net https://unpkg.com https://storage.googleapis.com https://tfhub.dev https://www.kaggle.com https://mediapipe.dev npm",
              "frame-src https://smartcaptcha.yandexcloud.net https://smartcaptcha.cloud.yandex.ru",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
