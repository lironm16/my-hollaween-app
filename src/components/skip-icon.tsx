/** Filled skip-forward icon — shared by map pins, list badges, and filters. */
export function SkipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 7a2 2 0 0 1 2-2h7v14H7a2 2 0 0 1-2-2V7Z"
      />
      <path
        fill="currentColor"
        d="M14.2 5.1a1.35 1.35 0 0 1 2.1.35l6.2 5.4a1.35 1.35 0 0 1 0 2.05l-6.2 5.4a1.35 1.35 0 0 1-2.1.35V5.1Z"
      />
    </svg>
  );
}

export const SKIP_ICON_SVG =
  '<svg class="pin-skip-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="#fff" d="M5 7a2 2 0 0 1 2-2h7v14H7a2 2 0 0 1-2-2V7Z"/><path fill="#fff" d="M14.2 5.1a1.35 1.35 0 0 1 2.1.35l6.2 5.4a1.35 1.35 0 0 1 0 2.05l-6.2 5.4a1.35 1.35 0 0 1-2.1.35V5.1Z"/></svg>';
