import { HOUSE_THEMES, type HouseStatus, type HouseTheme, type ScareLevel, type TreatId } from "@/lib/types";

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

export function suggestedHouseName(theme: HouseTheme) {
  return `${themeEmoji[theme]} ${themeLabels[theme]}`;
}

export function nameMatchesTheme(name: string, theme: HouseTheme) {
  const n = name.replace(/\s+/g, " ").trim();
  return (
    n === suggestedHouseName(theme) ||
    n === themeLabels[theme] ||
    n === `${themeLabels[theme]} ${themeEmoji[theme]}`
  );
}

export function themeFromName(name: string): HouseTheme | undefined {
  return HOUSE_THEMES.find((theme) => nameMatchesTheme(name, theme));
}

export function houseHeadline(house: { name: string; theme?: HouseTheme; soldOut?: boolean }) {
  const theme = house.theme ?? "pumpkin";
  const name = house.name.trim();
  if (house.soldOut && !name.includes("🕸️")) {
    return nameMatchesTheme(name, theme) || name.includes(themeEmoji[theme])
      ? `🕸️ ${name.replace(themeEmoji[theme], "").trim()}`
      : `🕸️ ${name}`;
  }
  if (name.includes(themeEmoji[theme]) || nameMatchesTheme(name, theme)) return name;
  return `${themeEmoji[theme]} ${name}`;
}

export const statusLabels: Record<HouseStatus, string> = {
  pending: "ממתין לאישור",
  approved: "מאושר",
  rejected: "נדחה",
};
