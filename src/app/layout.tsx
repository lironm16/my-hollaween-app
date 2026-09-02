import type { Metadata, Viewport } from "next";
import { Heebo, Creepster } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/providers";
import { HalloweenFx } from "@/components/halloween-fx";
import { config } from "@/lib/config";
import { inlineThemeCss } from "@/lib/inline-css";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
});

const creepster = Creepster({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-creepster",
});

export const metadata: Metadata = {
  title: config.appName,
  description: `${config.tagline} — ${config.neighborhood}`,
  applicationName: config.appName,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: config.appName,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#12081a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${creepster.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Creepster&family=Heebo:wght@400;600;800&display=swap"
          rel="stylesheet"
        />
        {/* Inlined: Cursor Preview is a different origin and Next.js 16 returns 403 for /_next CSS. */}
        {inlineThemeCss ? <style dangerouslySetInnerHTML={{ __html: inlineThemeCss }} /> : null}
        <link rel="stylesheet" href="/app.css" />
        <link rel="stylesheet" href="/shell.css" />
      </head>
      <body className="relative h-full min-h-dvh font-sans">
        <Script src="/boot.js" strategy="beforeInteractive" />
        <HalloweenFx />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
