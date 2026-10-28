/** Map pin clock badge for opening/closing soon — same slot as candy / closed / break. */

export type PinHoursBadgeKind = "opening" | "closing";

const CLOCK_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="2.1"/><path d="M12 7.2v5.1l3.4 2" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function pinHoursBadgeHtml(kind: PinHoursBadgeKind, ariaLabel?: string) {
  const label = ariaLabel ? ` aria-label="${ariaLabel.replace(/"/g, "&quot;")}"` : ' aria-hidden="true"';
  return `<b class="pin-status pin-hours-badge is-${kind}"${label}>${CLOCK_SVG}</b>`;
}

export function pinHoursAptDotHtml(kind: PinHoursBadgeKind) {
  return `<i class="pin-apt-dot pin-hours-badge is-${kind}" aria-hidden="true">${CLOCK_SVG}</i>`;
}
