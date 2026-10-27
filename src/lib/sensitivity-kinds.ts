import { treatLabels } from "@/lib/labels";
import type { SensitivityId } from "@/lib/types";

/** Static catalog for previews and docs — not locale-aware (Hebrew labels). */
export const SENSITIVITY_KINDS: { id: SensitivityId; label: string }[] = [
  { id: "glutenFree", label: treatLabels.glutenFree },
  { id: "nutsFree", label: treatLabels.nutsFree },
  { id: "sesameFree", label: treatLabels.sesameFree },
  { id: "vegan", label: treatLabels.vegan },
];
