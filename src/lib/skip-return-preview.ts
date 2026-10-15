import type { SkippedHouseMeta } from "@/lib/offline-db";
import {
  metaRestoreTriggers,
  skipReturnSectionVisible,
  temporaryRestoreWhenLabel,
} from "@/lib/skip-reasons";

export function skipReturnPreviewLine(meta: SkippedHouseMeta | undefined): string | null {
  if (!meta || !skipReturnSectionVisible(meta)) return null;
  const triggers = metaRestoreTriggers(meta);
  if (triggers.length === 0) return "הוסף תנאי להחזרה";
  return triggers.map((trigger) => temporaryRestoreWhenLabel(trigger)).join(" · ");
}
