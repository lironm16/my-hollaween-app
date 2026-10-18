import type { LocationStatus } from "@/hooks/use-user-location";

/** User can still tap «המיקום שלי» — only hard blocks are denied API / no geolocation. */
export function geoCanPromptLocation(status: LocationStatus): boolean {
  return status !== "denied" && status !== "unavailable";
}

export function geoLocationHintHe(status: LocationStatus): string {
  if (status === "denied") return "אשרו גישה למיקום בהגדרות";
  if (status === "error") return "לא התקבל מיקום — נסו שוב";
  return "GPS";
}

export function geoLocationFailureToastHe(
  status: LocationStatus,
  options?: { installedApp?: boolean },
): string | null {
  if (status === "denied") {
    if (options?.installedApp) {
      return "גישה למיקום חסומה לאפליקציה המותקנת. באנדרoid: הגדרות → האפליקציה → הרשאות → מיקום.";
    }
    return "גישה למיקום חסומה. אשרו בהגדרות הדפדפן או האפליקציה.";
  }
  if (status === "unavailable") return "המכשיר לא תומך במיקום.";
  if (status === "error") {
    return "לא הצלחנו לקרוא מיקום (GPS או רשת). ודאו ש-GPS פעיל ונסו שוב — לא בהכרח הרשאות.";
  }
  return null;
}
