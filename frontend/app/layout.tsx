import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { WalletProvider } from '@/components/wallet'
import './globals.css'

const geist = Geist({ 
  variable: '--font-geist-sans',
  subsets: ["latin"] 
});
const geistMono = Geist_Mono({ 
  variable: '--font-geist-mono',
  subsets: ["latin"] 
});

export const metadata: Metadata = {
  title: 'Learn & Earn - Polkadot Education',
  description: 'Master Polkadot & SMOL402, earn rewards through interactive learning',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#644a40',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}>
        <WalletProvider>{children}</WalletProvider>
        <Analytics />
      </body>
    </html>
  )
}
