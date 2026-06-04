import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Noto_Sans_Arabic, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { LocaleProvider } from '@/components/locale-provider'
import { RestoreAppNavigation } from '@/components/restore-app-navigation'
import { AppClientProviders } from '@/components/app-client-providers'
import { getDirection, resolveLocale } from '@/lib/i18n/config'
import { LOCALE_COOKIE } from '@/lib/i18n/config'
import { getMessages } from '@/lib/i18n/messages'
import './globals.css'

const notoSansArabic = Noto_Sans_Arabic({ 
  subsets: ['arabic', 'latin'],
  variable: '--font-sans'
})

const geistMono = Geist_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono'
})

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value)
  const messages = getMessages(locale)

  return {
    title: messages.app.metadataTitle,
    description: messages.app.metadataDescription,
    icons: {
      icon: '/icon.svg',
      apple: '/apple-icon.png',
    },
  }
}

export const viewport: Viewport = {
  themeColor: '#1a1a2e',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value)
  const dir = getDirection(locale)

  return (
    <html
      lang={locale}
      dir={dir}
      className="h-dvh min-h-0 bg-background"
      suppressHydrationWarning
    >
      <body
        className={`${notoSansArabic.variable} ${geistMono.variable} flex min-h-0 h-dvh max-h-dvh flex-col overflow-hidden font-sans antialiased`}
        suppressHydrationWarning
      >
        <LocaleProvider initialLocale={locale}>
          <RestoreAppNavigation />
          <AppClientProviders>{children}</AppClientProviders>
        </LocaleProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
