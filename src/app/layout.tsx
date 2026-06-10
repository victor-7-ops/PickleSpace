import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Barlow_Condensed } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'PickleSpace — Book Pickleball Courts in Cebu',
  description: 'Find and book pickleball courts in Cebu, Philippines. Real-time availability, GCash payments, and player matchmaking.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'PickleSpace' },
}

export const viewport: Viewport = {
  themeColor: '#162b64',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', plusJakartaSans.variable, barlowCondensed.variable)} style={{ colorScheme: 'light' }}>
      <body>{children}</body>
    </html>
  )
}
