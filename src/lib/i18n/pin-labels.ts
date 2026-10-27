import type { AppLocale } from "@/lib/i18n/locale";
import { formatMessage } from "@/lib/i18n/format";
import { messagesForLocale } from "@/lib/i18n/translate";
import type { CandyTone, DecorLevel, ScareLevel } from "@/lib/types";

export function decorShortForLocale(locale: AppLocale): Record<DecorLevel, string> {
  const l = messagesForLocale(locale).labels;
  return {
    none: l.decorNone,
    mild: l.scareMild,
    medium: l.scareMedium,
    heavy: l.scareSpicy,
  };
}

export function scareShortForLocale(locale: AppLocale): Record<ScareLevel, string> {
  const l = messagesForLocale(locale).labels;
  return {
    mild: l.scareMild,
    medium: l.scareMedium,
    spicy: l.scareSpicy,
  };
}

export function candyToneLabelForLocale(locale: AppLocale, tone: CandyTone): string {
  const labels = messagesForLocale(locale).labels;
  if (tone === "none") return labels.candyNone;
  const stock =
    tone === "plenty" ? labels.candyPlenty : tone === "low" ? labels.candyLow : labels.candyOut;
  return formatMessage(labels.candyWithStock, { stock });
}
