import type { Metadata, Viewport } from "next";
import { Rubik, Creepster } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/providers";
import { HalloweenFx } from "@/components/halloween-fx";
import { RehearsalBoot } from "@/components/rehearsal-boot";
import { config } from "@/lib/config";
import { getInlineThemeCss } from "@/lib/inline-css";
import "./globals.css";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-rubik",
});

const creepster = Creepster({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-creepster",
});

export const metadata: Metadata = {
  title: config.tabTitle,
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
  const themeCss = getInlineThemeCss();
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${rubik.variable} ${creepster.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Creepster&family=Rubik:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Inlined: Cursor Preview is a different origin and Next.js 16 returns 403 for /_next CSS. */}
        {themeCss ? <style dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
        <link rel="stylesheet" href="/app.css?v=97" />
        <meta name="hw-build" content="2026-09-10-push-save-v82" />
        <link rel="stylesheet" href="/shell.css?v=55" />
      </head>
      <body className="relative h-full min-h-dvh font-sans">
        <Script src="/boot.js" strategy="beforeInteractive" />
        <HalloweenFx />
        <RehearsalBoot />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
