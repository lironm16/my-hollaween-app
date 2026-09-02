import type { HouseStatus, ScareLevel, TreatId } from "@/lib/types";

export const treatLabels: Record<TreatId, string> = {
  candy: "ממתקים",
  chocolate: "שוקולד",
  glutenFree: "ללא גלוטן",
  vegan: "טבעוני",
  fruit: "פירות",
  toys: "צעצועים",
  drinks: "שתייה",
  allergenFriendly: "ידידותי לאלרגיות",
};

export const scareLabels: Record<ScareLevel, string> = {
  mild: "עדין — לקטנטנים",
  medium: "בינוני",
  spicy: "מפחיד ממש",
};

export const scareShort: Record<ScareLevel, string> = {
  mild: "עדין",
  medium: "בינוני",
  spicy: "מפחיד",
};

export const statusLabels: Record<HouseStatus, string> = {
  pending: "ממתין לאישור",
  approved: "מאושר",
  rejected: "נדחה",
};
