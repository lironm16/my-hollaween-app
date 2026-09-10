import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { pwaManifestForUserAgent } from "@/lib/pwa-manifest";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const headerList = await headers();
  return pwaManifestForUserAgent(headerList.get("user-agent") ?? "");
}
