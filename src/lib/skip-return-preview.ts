import type { SkippedHouseMeta } from "@/lib/offline-db";
import { skipReturnAutoDisplayLabel, skipReturnSectionVisible } from "@/lib/skip-reasons";

export function skipReturnPreviewLine(meta: SkippedHouseMeta | undefined): string | null {
  if (!meta || !skipReturnSectionVisible(meta)) return null;
  return skipReturnAutoDisplayLabel(meta);
}
