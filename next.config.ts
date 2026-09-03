import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_DURABLE_WRITES: process.env.NEXT_PUBLIC_DURABLE_WRITES ?? "1",
  },
  // Keep the seed on Vercel so /api/catalog can boot without a writable data dir.
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/seed.json"],
  },
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "[::1]",
    "**.localhost",
    "*.cursor.sh",
    "**.cursor.sh",
    "*.cursor.com",
    "**.cursor.com",
    "*.cursorusercontent.com",
    "**.cursorusercontent.com",
    "*.oncursor.com",
    "**.oncursor.com",
    "*.vercel.app",
    "**.vercel.app",
  ],
  async headers() {
    return [
      {
        source: "/catalog.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
      {
        source: "/shell.css",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
      {
        source: "/app.css",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
      {
        source: "/boot.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
      {
        source: "/icon-:size.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
