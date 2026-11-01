export const ACCESSIBILITY_LEVELS = ["accessible", "partial", "not_accessible"] as const;
export type AccessibilityLevel = (typeof ACCESSIBILITY_LEVELS)[number];

export const ENTRY_LEVELS = ["ground_entrance_lobby", "not_ground"] as const;
export type EntryLevel = (typeof ENTRY_LEVELS)[number];

export const HOUSE_DISPLAY_TIERS = ["subtle", "very_nice", "wild"] as const;
export type HouseDisplayTier = (typeof HOUSE_DISPLAY_TIERS)[number];

export function isAccessibilityLevel(value: unknown): value is AccessibilityLevel {
  return typeof value === "string" && (ACCESSIBILITY_LEVELS as readonly string[]).includes(value);
}

export function isEntryLevel(value: unknown): value is EntryLevel {
  return typeof value === "string" && (ENTRY_LEVELS as readonly string[]).includes(value);
}

export function isHouseDisplayTier(value: unknown): value is HouseDisplayTier {
  return typeof value === "string" && (HOUSE_DISPLAY_TIERS as readonly string[]).includes(value);
}

/** Legacy rows: true → accessible; false/ missing level → undefined (form must ask). */
export function resolveAccessibilityLevel(house: {
  accessibilityLevel?: AccessibilityLevel;
  accessible?: boolean;
}): AccessibilityLevel | undefined {
  if (isAccessibilityLevel(house.accessibilityLevel)) return house.accessibilityLevel;
  if (house.accessible === true) return "accessible";
  return undefined;
}

export function resolveEntryLevel(house: { entryLevel?: EntryLevel }): EntryLevel | undefined {
  return isEntryLevel(house.entryLevel) ? house.entryLevel : undefined;
}

export function resolveDisplayTier(house: { displayTier?: HouseDisplayTier }): HouseDisplayTier | undefined {
  return isHouseDisplayTier(house.displayTier) ? house.displayTier : undefined;
}

/** Keeps legacy `accessible` in sync for routes / filters. */
export function accessibleBooleanFromLevel(level: AccessibilityLevel): boolean {
  return level === "accessible";
}

export function syncVisitorFieldsOnInput<T extends { accessibilityLevel?: AccessibilityLevel; accessible?: boolean }>(
  input: T,
): T {
  const level = input.accessibilityLevel;
  if (!level) return input;
  return { ...input, accessible: accessibleBooleanFromLevel(level) };
}

export function housePassesAccessibleRouteFilter(house: {
  accessibilityLevel?: AccessibilityLevel;
  accessible?: boolean;
}): boolean {
  const level = resolveAccessibilityLevel(house);
  if (level) return level === "accessible" || level === "partial";
  return Boolean(house.accessible);
}
