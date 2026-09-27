import { bearingClockLabelHe } from "@/lib/gem-hunt";

export const GEM_BEHIND_TURN_DEG = 120;

export function gemWalkGuideCopy(
  huntArrowPhoneRelative: boolean,
  facingTarget: boolean,
  turnBearing: number | null,
  gpsBearingToAnchor: number | null,
) {
  if (huntArrowPhoneRelative && turnBearing != null) {
    if (facingTarget) return "המשיכו ישר — היהלום מולכם";
    if (Math.abs(turnBearing) >= GEM_BEHIND_TURN_DEG) {
      return "היהלום מאחוריכם — סובבו את הגוף";
    }
    if (turnBearing > 0) return "סובבו ימינה לכיוון היהלום";
    return "סובבו שמאלה לכיוון היהלום";
  }
  if (gpsBearingToAnchor != null) {
    return `כיוון לפי GPS: ${bearingClockLabelHe(gpsBearingToAnchor)} — סובבו את הגוף (צפון = למעלה)`;
  }
  return "התקרבו לנקודת היהלום";
}
