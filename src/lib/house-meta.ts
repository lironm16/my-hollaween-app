import type { PublicHouse } from "@/lib/types";

import type { AppLocale } from "@/lib/i18n/locale";

export function formatHouseAddedAt(iso: string, locale: AppLocale = "he") {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const tag = locale === "en" ? "en-US" : "he-IL";
  return date.toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" });
}

/** One line for when the house was registered — submitter name is admin-only. */
export function houseAddedMetaLine(
  house: Pick<PublicHouse, "createdAt"> & { addedBy?: string | null },
  options?: { showSubmitterName?: boolean },
) {
  const when = house.createdAt ? formatHouseAddedAt(house.createdAt) : "";
  const who = options?.showSubmitterName ? house.addedBy?.trim() : "";
  if (who && when) return `נוסף על ידי ${who} · ${when}`;
  if (who) return `נוסף על ידי ${who}`;
  if (when) return `נוסף ${when}`;
  return null;
}
