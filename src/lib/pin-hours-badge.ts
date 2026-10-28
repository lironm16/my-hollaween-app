/** Map pin clock badge for opening/closing soon — same slot as candy / closed / break. */

export type PinHoursBadgeKind = "opening" | "closing";

const CLOCK_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.35"/><path d="M12 6.8v5.4l3.6 2.1" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function pinHoursBadgeHtml(kind: PinHoursBadgeKind, ariaLabel?: string) {
  const label = ariaLabel ? ` aria-label="${ariaLabel.replace(/"/g, "&quot;")}"` : ' aria-hidden="true"';
  return `<b class="pin-status pin-hours-badge is-${kind}"${label}>${CLOCK_SVG}</b>`;
}

export function pinHoursAptDotHtml(kind: PinHoursBadgeKind) {
  return `<i class="pin-apt-dot pin-hours-badge is-${kind}" aria-hidden="true">${CLOCK_SVG}</i>`;
}
