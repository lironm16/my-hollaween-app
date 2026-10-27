import type { SensitivityId } from "@/lib/types";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

const TREAT_LABEL_KEYS: Record<SensitivityId, string> = {
  glutenFree: "labels.treatGlutenFree",
  nutsFree: "labels.treatNutsFree",
  sesameFree: "labels.treatSesameFree",
  vegan: "labels.treatVegan",
};

export function localizedTreatLabel(locale: AppLocale, id: SensitivityId): string {
  const key = TREAT_LABEL_KEYS[id];
  return key ? translate(locale, key) : id;
}
