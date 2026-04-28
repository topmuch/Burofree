import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Maellis — Assistant Intelligent Freelance",
  description: "Votre copilote de travail intelligent pour freelancers — gestion de projets, facturation, time tracking et IA",
  keywords: [
    "freelance",
    "IA",
    "productivité",
    "tâches",
    "calendrier",
    "emails",
    "facturation",
    "assistant",
    "gestion de temps",
    "portail client",
    "automatisation",
    "Maellis",
  ],
  authors: [{ name: "Maellis", url: "https://maellis.com" }],
  creator: "Maellis",
  publisher: "Maellis",
  category: "Business Application",
  classification: "Productivity Software",
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://maellis.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: process.env.NEXTAUTH_URL || "https://maellis.com",
    siteName: "Maellis",
    title: "Maellis — Le Copilote Intelligent pour Freelances",
    description: "Gérez vos tâches, emails, factures et calendrier en un seul endroit. Maellis automatise le reste avec l'IA.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Maellis — Le Copilote Intelligent pour Freelances",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Maellis — Le Copilote Intelligent pour Freelances",
    description: "Gérez vos tâches, emails, factures et calendrier en un seul endroit. Maellis automatise le reste avec l'IA.",
    images: ["/api/og"],
    creator: "@maellis",
  },
  verification: {
    google: "GOOGLE_SITE_VERIFICATION_CODE",
  },
  appLinks: {
    ios: {
      url: "https://apps.apple.com/app/maellis",
      app_name: "Maellis",
      app_store_id: "1234567890",
    },
    android: {
      url: "https://play.google.com/store/apps/details?id=com.maellis.app",
      app_name: "Maellis",
      package: "com.maellis.app",
    },
    web: {
      url: process.env.NEXTAUTH_URL || "https://maellis.com",
      should_fallback: true,
    },
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#10b981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
