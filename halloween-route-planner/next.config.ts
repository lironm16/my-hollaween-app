import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  i18n: {
    defaultLocale: "he",
    locales: ["he"],
    localeDetection: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
      },
    ],
  },
  experimental: {
    typedRoutes: true,
    optimizePackageImports: ["@tanstack/react-query", "lucide-react"],
  },
  transpilePackages: ["mapbox-gl", "react-map-gl"],
};

export default nextConfig;
