/** Full-bleed poster art for the countdown screen (user-provided inspiration). */
export const COUNTDOWN_ART = {
  welcome: "/images/countdown/welcome-arch.jpg",
  /** Default when reopening from the bar. */
  default: "/images/countdown/graveyard-sign.jpg",
  /** Rotates on repeat opens so the screen stays fresh. */
  rotate: [
    "/images/countdown/graveyard-sign.jpg",
    "/images/countdown/preparations.jpg",
    "/images/countdown/open-door.jpg",
    "/images/countdown/friends-needs-you.jpg",
  ] as const,
} as const;

export function countdownBackground(welcome: boolean, seed = 0) {
  if (welcome) return COUNTDOWN_ART.welcome;
  const pool = COUNTDOWN_ART.rotate;
  return pool[Math.abs(seed) % pool.length];
}
