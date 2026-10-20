import { neighborhoodAtEventLocation, type NeighborhoodId } from "@/lib/config";

export const ADD_HOUSE_OUTSIDE_EVENT_ZONES_HE =
  "ניתן להוסיף בתים רק בתוך ארבע השכונות של האירוע (גפן, חרוזים, נחלת גנים, שיכון ותיקים) — בדקו את הכתובת על המפה.";

/** Geo-derived hood for new houses; null when the pin is outside event polygons. */
export function eventNeighborhoodForNewHousePin(
  lat: number,
  lng: number,
): NeighborhoodId | null {
  return neighborhoodAtEventLocation(lat, lng);
}
