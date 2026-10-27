import type { HoursWindow } from "@/lib/types";
import { hoursWindowsIssueId, visitWindowIssueId, type HoursWindowsIssueId, type VisitWindowIssueId } from "@/lib/hours";
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

const VISIT_WINDOW_ISSUE_KEYS: Record<VisitWindowIssueId, string> = {
  invalidFrom: "filters.visitWindowInvalidFrom",
  invalidTo: "filters.visitWindowInvalidTo",
  endBeforeStart: "filters.visitWindowEndBeforeStart",
};

export function visitWindowIssueLocalized(
  visitWindowFrom: string,
  visitWindowTo: string,
  locale: AppLocale,
): string | null {
  const id = visitWindowIssueId(visitWindowFrom, visitWindowTo);
  if (!id) return null;
  return translate(locale, VISIT_WINDOW_ISSUE_KEYS[id]);
}
