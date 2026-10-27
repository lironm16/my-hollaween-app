import type { HoursWindow } from "@/lib/types";
import { hoursWindowsIssueId, type HoursWindowsIssueId } from "@/lib/hours";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

const HOURS_ISSUE_KEYS: Record<HoursWindowsIssueId, string> = {
  needOne: "houseForm.hoursNeedOne",
  incomplete: "houseForm.hoursIncomplete",
  closeAfterOpen: "houseForm.hoursCloseAfterOpen",
  overlap: "houseForm.hoursOverlap",
};

export function hoursWindowsIssueLocalized(
  windows: HoursWindow[],
  locale: AppLocale,
): string | null {
  const id = hoursWindowsIssueId(windows);
  if (!id) return null;
  return translate(locale, HOURS_ISSUE_KEYS[id]);
}
