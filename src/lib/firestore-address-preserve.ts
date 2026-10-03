import type { House } from "@/lib/types";

/** Do not wipe stored street/arrival when a redacted catalog row is persisted by mistake. */
export function preserveStoredAddressFields(incoming: House, existing?: House | null): House {
  if (!existing) return incoming;
  const address = incoming.address?.trim()
    ? incoming.address
    : existing.address?.trim()
      ? existing.address
      : incoming.address ?? "";
  const arrival = incoming.arrival?.trim()
    ? incoming.arrival
    : existing.arrival?.trim()
      ? existing.arrival
      : incoming.arrival ?? "";
  if (address === incoming.address && arrival === incoming.arrival) return incoming;
  return { ...incoming, address, arrival };
}
