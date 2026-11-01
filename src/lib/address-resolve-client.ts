import type { LocationResolution } from "@/lib/location-resolution";
import type { AddressHit } from "@/lib/types";

export async function resolveAddressHit(
  hit: AddressHit,
  query = "",
): Promise<{ hit: AddressHit; resolution: LocationResolution } | null> {
  const res = await fetch("/api/address/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...hit, query }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    hit?: AddressHit;
    resolution?: LocationResolution;
  };
  if (!data.hit || !data.resolution) return null;
  return { hit: data.hit, resolution: data.resolution };
}
