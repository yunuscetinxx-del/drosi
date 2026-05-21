import type { Metadata, Viewport } from 'next'
import { Noto_Sans_Arabic, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const notoSansArabic = Noto_Sans_Arabic({ 
  subsets: ['arabic'],
  variable: '--font-sans'
})

const geistMono = Geist_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono'
})

export const metadata: Metadata = {
  title: 'دروسي - إدارة الدروس والملاحظات',
  description: 'تطبيق متكامل لإدارة الدروس والملاحظات مع الخرائط الذهنية',
}

export const viewport: Viewport = {
  themeColor: '#1a1a2e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-dvh min-h-0 bg-background">
      <body
        className={`${notoSansArabic.variable} ${geistMono.variable} flex min-h-0 h-dvh max-h-dvh flex-col overflow-hidden font-sans antialiased`}
      >
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
