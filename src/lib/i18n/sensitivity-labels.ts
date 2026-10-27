import type { SensitivityId } from "@/lib/types";

const SENSITIVITY_LABEL_KEYS: Record<SensitivityId, string> = {
  glutenFree: "labels.treatGlutenFree",
  nutsFree: "labels.treatNutsFree",
  sesameFree: "labels.treatSesameFree",
  vegan: "labels.treatVegan",
};

export function sensitivityLabelKey(kind: SensitivityId): string {
  return SENSITIVITY_LABEL_KEYS[kind];
}
