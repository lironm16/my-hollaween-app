/** Whether to show server like/visit totals on a house card. */
export function showCommunityEngagementCounts(
  enabled: boolean,
  admin: boolean,
  ownedHouseIds: ReadonlySet<string> | readonly string[],
  houseId: string,
): boolean {
  if (!enabled) return false;
  if (admin) return true;
  const owned =
    ownedHouseIds instanceof Set ? ownedHouseIds : new Set(ownedHouseIds);
  return owned.has(houseId);
}
