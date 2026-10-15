import type { SkipReasonId } from "@/lib/skip-reasons";

/** User-facing skip reason choices (device note + meta.reason). */
export type SkipReasonCategory = "not-open" | "candy-out" | "other";

export const SKIP_REASON_CATEGORIES: {
  id: SkipReasonCategory;
  label: string;
}[] = [
  { id: "not-open", label: "הבית לא פתוח" },
  { id: "candy-out", label: "אין ממתקים" },
  { id: "other", label: "אחר" },
];

export function normalizeSkipReasonCategory(reason: SkipReasonId | undefined): SkipReasonCategory {
  if (reason === "not-open") return "not-open";
  if (reason === "candy-out" || reason === "candy-low") return "candy-out";
  return "other";
}

export function skipReasonCategoryLabel(category: SkipReasonCategory): string {
  return SKIP_REASON_CATEGORIES.find((item) => item.id === category)?.label ?? "אחר";
}

export function skipReasonPreview(category: SkipReasonCategory | undefined, note?: string): string {
  const label = category ? skipReasonCategoryLabel(category) : "";
  const text = note?.trim();
  if (label && text) return `${label} · ${text}`;
  return text || label || "";
}
