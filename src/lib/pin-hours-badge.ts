/** Map pin clock badge for opening/closing soon — same slot as candy / closed / break. */

export type PinHoursBadgeKind = "opening" | "closing";

export function pinHoursBadgeHtml(kind: PinHoursBadgeKind, ariaLabel?: string) {
  const label = ariaLabel ? ` aria-label="${ariaLabel.replace(/"/g, "&quot;")}"` : ' aria-hidden="true"';
  return `<b class="pin-status pin-hours-badge is-${kind}"${label}></b>`;
}

export function pinHoursAptDotHtml(kind: PinHoursBadgeKind) {
  return `<i class="pin-apt-dot pin-hours-badge is-${kind}" aria-hidden="true"></i>`;
}
