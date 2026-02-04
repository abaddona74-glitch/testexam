import "./globals.css";
import { Inter } from "next/font/google";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  metadataBase: new URL('https://test-exam.uz'),
  title: {
    default: "Test Exam Uz - Online Tests Platform Uzbekistan",
    template: "%s | Test Exam Uz"
  },
  description: "Test-exam.uz - O'zbekistondagi eng yaxshi onlayn test platformasi. Data Mining, Project Management va boshqa fanlardan bilimingizni sinab ko'ring. Test exam uz.",
  keywords: ["test exam uz", "test-exam.uz", "online test uz", "testlar", "quiz", "education", "student", "practice test", "exam platform", "test yechish"],
  authors: [{ name: "Exam Platform Team" }],
  creator: "Exam Platform Team",
  publisher: "Test Exam Platform",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Test Exam Uz - Online Tests Platform",
    description: "Test-exam.uz orqali bilimingizni sinang. Real vaqt rejimida natijalar va reytinglar.",
    url: 'https://test-exam.uz',
    siteName: 'Test Exam Uz',
    locale: 'uz_UZ',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg', // You should create this image or use logo
        width: 1200,
        height: 630,
        alt: 'Test Exam Uz Platform Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Test Exam Uz",
    description: "O'zbekistondagi onlayn test platformasi.",
    images: ['/og-image.jpg'], // Same as OG
  },
  verification: {
    google: "hpurLIYBvtzbS5FFKoaBdlaMRdFgTbeaHzt-ag4Ss1w",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Load reCAPTCHA script only if key is present to avoid errors */}
        {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
          <Script
             src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
             strategy="afterInteractive"
          />
        )}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
