import type { NextConfig } from "next";

const corsHeaders = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD" },
  { key: "Access-Control-Allow-Headers", value: "*" },
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_DURABLE_WRITES: process.env.NEXT_PUBLIC_DURABLE_WRITES ?? "1",
  },
  serverExternalPackages: ["web-push"],
  // Keep the seed on Vercel so /api/catalog can boot without a writable data dir.
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/seed.json"],
  },
  allowedDevOrigins: [
    // Cursor Preview iframes send Origin: null (opaque/sandboxed). Next 16
    // otherwise 403s /_next CSS and JS with body "Unauthorized".
    "null",
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
    "*.trycloudflare.com",
    "**.trycloudflare.com",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:43127",
        "127.0.0.1:43127",
        "*.vercel.app",
        "*.cursor.com",
        "*.cursorusercontent.com",
        "*.oncursor.com",
        "*.trycloudflare.com",
      ],
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: corsHeaders,
      },
      {
        source: "/catalog.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=120, s-maxage=300, stale-while-revalidate=1800",
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
