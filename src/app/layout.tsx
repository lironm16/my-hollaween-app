import type { Metadata, Viewport } from "next";
import { Heebo, Creepster } from "next/font/google";
import { Providers } from "@/components/providers";
import { HalloweenFx } from "@/components/halloween-fx";
import { config } from "@/lib/config";
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
      <body className="relative h-full min-h-dvh font-sans">
        <HalloweenFx />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
