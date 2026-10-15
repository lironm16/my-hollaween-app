import type { SkippedHouseMeta } from "@/lib/offline-db";
import {
  skipReturnAutoDisplayLabel,
  skipReturnOfferEligible,
  skipReturnOfferLabelFromSnapshot,
} from "@/lib/skip-reasons";

export function skipReturnPreviewLine(meta: SkippedHouseMeta | undefined): string | null {
  if (!meta || !skipReturnOfferEligible(meta)) return null;
  return skipReturnOfferLabelFromSnapshot(meta.statusKey);
}

/** List/map preview — only when the user turned the return switch on. */
export function skipReturnActivePreviewLine(meta: SkippedHouseMeta | undefined): string | null {
  if (!meta) return null;
  return skipReturnAutoDisplayLabel(meta);
}
