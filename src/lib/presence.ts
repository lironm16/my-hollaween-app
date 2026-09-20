/** Sessions seen in the last N ms count as "active now". */
export const PRESENCE_WINDOW_MS = 5 * 60 * 1000;

export const PRESENCE_COLLECTION = "hw_presence";

export type PresenceSummary = {
  active: number;
  windowMinutes: number;
};
