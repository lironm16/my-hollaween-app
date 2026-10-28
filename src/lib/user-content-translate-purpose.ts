export type UserContentTranslatePurpose = "prose" | "proper_name";

export function userContentTranslateCacheKey(
  source: string,
  target: string,
  purpose: UserContentTranslatePurpose,
): string {
  return `${purpose}\0${target}\0${source}`;
}
