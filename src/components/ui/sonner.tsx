"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

/**
 * Toaster component for toast notifications.
 * Uses dark theme by default (matches app's dark mode).
 * Previously used next-themes useTheme(), but no ThemeProvider
 * exists in the app, so we default to "dark" directly.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
