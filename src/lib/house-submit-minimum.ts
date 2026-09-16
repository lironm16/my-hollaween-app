/** Client form rule: a house needs decor or candy (unless closed for the night). */
export function houseOfferMinimumMet(decorLevel: string, candy: string): boolean {
  const undecorated = decorLevel === "none";
  const hasCandy = candy === "plenty" || candy === "low";
  return !undecorated || hasCandy;
}
