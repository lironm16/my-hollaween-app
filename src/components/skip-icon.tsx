/** Skip-forward icon: thick bar + one filled triangle (⏭ style). */
export function SkipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M5 10h8v4H5z" />
      <path fill="currentColor" d="M14 7.5 21 12 14 16.5Z" />
    </svg>
  );
}

export const SKIP_ICON_SVG =
  '<svg class="pin-skip-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="#fff" d="M5 10h8v4H5z"/><path fill="#fff" d="M14 7.5 21 12 14 16.5Z"/></svg>';
