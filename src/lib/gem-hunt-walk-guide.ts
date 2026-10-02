import { isIosLike } from "@/lib/gem-hunt-ar-platform";
import { bearingClockLabelHe } from "@/lib/gem-hunt";

export const GEM_BEHIND_TURN_DEG = 120;

/** iOS: compass arrow is straight-line — use walking maps instead. */
export function gemNavPrefersStreetMaps(): boolean {
  return typeof navigator !== "undefined" && isIosLike();
}

export function gemStreetNavGuideCopy(distanceLabel: string | null): string {
  const dist = distanceLabel ? ` · ${distanceLabel}` : "";
  return `הליכה ברחוב${dist} — לא בקו ישר דרך בניינים`;
}

export function gemStreetRouteNavCopy(
  routeStatus: "loading" | "ready" | "error",
  distanceLabel: string | null,
): string {
  const dist = distanceLabel ? ` · ${distanceLabel}` : "";
  if (routeStatus === "loading") return `מחשבים מסלול ברחוב${dist}…`;
  if (routeStatus === "ready") return `עקבו אחרי החץ — מסלול ברחוב${dist}`;
  return gemStreetNavGuideCopy(distanceLabel);
}

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
