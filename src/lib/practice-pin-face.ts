/** Bat silhouette for practice house map pins (preview row 4 — עטלף). */
export const PRACTICE_PIN_BAT_SVG = `<svg class="pin-practice-bat" viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" d="M12 9.2c1.4-2.6 3.6-4.8 6.6-5.6-1.1 2.2-.6 4.3.8 6.2 1.6 2.1 3.4 3.3 4.4 3.2-2.2 1.1-4.1.6-6.2-.4L12 20.4 6.4 12.6c-2.1 1-4 .8-6.2-.4 1-.1 2.8-1.1 4.4-3.2 1.4-1.9 1.9-4 .8-6.2 3 .8 5.2 3 6.6 5.6Z"/></svg>`;

export function practicePinFaceHtml() {
  return `<span class="pin-practice-face" aria-hidden="true">${PRACTICE_PIN_BAT_SVG}</span>`;
}
