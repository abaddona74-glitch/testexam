import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  metadataBase: new URL('https://test-exam.uz'),
  title: {
    default: "Test Exam Platform - Online Tests & Quizzes",
    template: "%s | Test Exam Platform"
  },
  description: "Take comprehensive online exams, quizzes, and practice tests. Improve your knowledge in Data Mining, Digitalization, Project Management, and more.",
  keywords: ["exam", "test", "quiz", "online testing", "education", "student", "practice test", "data mining", "software project management"],
  authors: [{ name: "Exam Platform Team" }],
  creator: "Exam Platform Team",
  publisher: "Test Exam Platform",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Test Exam Platform - Professional Online Testing",
    description: "Join thousands of students testing their knowledge. Real-time results, leaderboards, and detailed analytics.",
    url: 'https://test-exam.uz',
    siteName: 'Test Exam Platform',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg', // You should create this image or use logo
        width: 1200,
        height: 630,
        alt: 'Test Exam Platform Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Test Exam Platform",
    description: "Take comprehensive online exams and track your progress.",
    images: ['/og-image.jpg'], // Same as OG
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
  verification: {
    google: "ZyngArPTJJcHAhrTF2lIphBONCjoARI7PJaxv4e69xw", // Validate real code
    yandex: "YOUR_YANDEX_VERIFICATION_CODE", // User needs to add this
  },
};

import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
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
