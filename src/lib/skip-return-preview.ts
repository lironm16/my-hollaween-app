import type { SkippedHouseMeta } from "@/lib/offline-db";
import { skipReturnOfferEligible, skipReturnOfferLabelFromSnapshot } from "@/lib/skip-reasons";

export function skipReturnPreviewLine(meta: SkippedHouseMeta | undefined): string | null {
  if (!meta || !skipReturnOfferEligible(meta)) return null;
  return skipReturnOfferLabelFromSnapshot(meta.statusKey);
}
