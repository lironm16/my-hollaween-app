import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "[::1]",
    "*.cursor.sh",
    "*.cursor.com",
    "*.cursorusercontent.com",
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
