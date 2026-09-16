import type { GoogleMapsRouteSegment } from "@/lib/route";

export function openGoogleMapsUrl(url: string) {
  if (typeof window === "undefined") return;
  window.location.assign(url);
}

export function openGoogleMapsRouteSegment(segment: GoogleMapsRouteSegment) {
  openGoogleMapsUrl(segment.url);
}
