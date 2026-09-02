import type { HouseStatus, HouseTheme, ScareLevel, TreatId } from "@/lib/types";

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

export const themeLabels: Record<HouseTheme, string> = {
  ghost: "בית רפאים",
  witch: "בית המכשפה",
  pumpkin: "בית הדלעת",
  vampire: "בית הערפד",
  skeleton: "בית השלדים",
  monster: "בית המפלצת",
  haunted: "בית רדוף",
  candy: "בית הממתקים",
  spider: "בית העכבישים",
  blackCat: "בית החתול השחור",
};

export const themeEmoji: Record<HouseTheme, string> = {
  ghost: "👻",
  witch: "🧹",
  pumpkin: "🎃",
  vampire: "🧛",
  skeleton: "💀",
  monster: "👹",
  haunted: "🏚️",
  candy: "🍬",
  spider: "🕷️",
  blackCat: "🐈‍⬛",
};

export const statusLabels: Record<HouseStatus, string> = {
  pending: "ממתין לאישור",
  approved: "מאושר",
  rejected: "נדחה",
};
