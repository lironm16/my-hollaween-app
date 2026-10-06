import { bearingClockLabelHe } from "@/lib/gem-hunt";
import {
  GEM_WALK_APPROACH_HE,
  GEM_WALK_BEHIND_HE,
  GEM_WALK_STRAIGHT_HE,
  GEM_WALK_TURN_LEFT_HE,
  GEM_WALK_TURN_RIGHT_HE,
} from "@/lib/gem-hunt-copy";

export const GEM_BEHIND_TURN_DEG = 120;

export function gemWalkGuideCopy(
  huntArrowPhoneRelative: boolean,
  facingTarget: boolean,
  turnBearing: number | null,
  gpsBearingToAnchor: number | null,
) {
  if (huntArrowPhoneRelative && turnBearing != null) {
    if (facingTarget) return GEM_WALK_STRAIGHT_HE;
    if (Math.abs(turnBearing) >= GEM_BEHIND_TURN_DEG) {
      return GEM_WALK_BEHIND_HE;
    }
    if (turnBearing > 0) return GEM_WALK_TURN_RIGHT_HE;
    return GEM_WALK_TURN_LEFT_HE;
  }
  if (gpsBearingToAnchor != null) {
    return `כיוון לפי GPS: ${bearingClockLabelHe(gpsBearingToAnchor)} — סובבו את הגוף (צפון = למעלה)`;
  }
  return GEM_WALK_APPROACH_HE;
}
