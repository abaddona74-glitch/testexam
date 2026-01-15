export default function robots() {
    return {
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: '/api/',
      },
      sitemap: 'https://test-exam.uz/sitemap.xml',
    }
  }