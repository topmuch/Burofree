/**
 * Superadmin Isolated Layout
 *
 * IMPORTANT: This layout is completely separate from the main app layout.
 * No user-facing components, sidebar, or CSS from the main app is loaded.
 * The superadmin panel has its own navigation, styling, and security layer.
 *
 * NOTE: <html> and <body> are provided by the root layout.tsx.
 * Route group layouts must NOT render their own <html>/<body>.
 */

import type { Metadata } from 'next'
import './superadmin-globals.css'

export const metadata: Metadata = {
  title: 'Burozen — Superadmin',
  description: 'Panneau d\'administration plateforme Burozen',
  robots: 'noindex, nofollow', // Never index admin pages
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}
