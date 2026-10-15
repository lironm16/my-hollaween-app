import { appNow } from "@/lib/app-clock";
import { visitorAddressRevealContext, type AddressRevealContext } from "@/lib/address-reveal";
import { loadOwnedHouses } from "@/lib/offline-db";
import { nightPassAudience, readNightPassState } from "@/lib/night-pass-client";
import type { AddressRevealSchedule } from "@/lib/types";

/** «תצוגת משתמש» — client rehearsal clock + catalog reveal schedule + night-pass audience. */
export function visitorPreviewAddressRevealContext(
  addressReveal?: AddressRevealSchedule,
  now: Date = appNow(),
): AddressRevealContext {
  return visitorAddressRevealContext(
    now,
    loadOwnedHouses().map((row) => row.id),
    addressReveal,
    nightPassAudience(readNightPassState()),
  );
}
