import type { SkippedHouseMeta } from "@/lib/offline-db";
import {
  skipReturnAutoDisplayLabel,
  skipReturnOfferEligible,
  skipReturnOfferLabelFromSnapshot,
  skipReturnRuleActive,
} from "@/lib/skip-reasons";

export function skipReturnPreviewLine(meta: SkippedHouseMeta | undefined): string | null {
  if (!meta || !skipReturnOfferEligible(meta)) return null;
  if (skipReturnRuleActive(meta)) return skipReturnAutoDisplayLabel(meta);
  return skipReturnOfferLabelFromSnapshot(meta.statusKey);
}
