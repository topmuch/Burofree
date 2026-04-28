/**
 * Superadmin Isolated Layout
 *
 * IMPORTANT: This layout is completely separate from the main app layout.
 * No user-facing components, sidebar, or CSS from the main app is loaded.
 * The superadmin panel has its own navigation, styling, and security layer.
 */

import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './superadmin-globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Burofree — Superadmin',
  description: 'Panneau d\'administration plateforme Burofree',
  robots: 'noindex, nofollow', // Never index admin pages
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        {children}
      </body>
    </html>
  )
}
