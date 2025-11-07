import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { AppProviders } from "@/components/providers/app-providers";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  title: "מסלול ליל כל הקדושים",
  description:
    "הכינו מסלול טריק-אור-טריט מושלם, מצאו בתים משתתפים, בדקו נגישות ועדכוני סוכריות בזמן אמת.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${rubik.variable} font-sans antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
