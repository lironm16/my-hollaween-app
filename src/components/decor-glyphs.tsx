import type { ReactNode } from "react";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-full w-full">
      {children}
    </svg>
  );
}

/** Outdoor decoration mark for decor-only visits. */
export function DecorGlyph() {
  return (
    <Icon>
      <path
        d="M3 6.2c5 4.2 13 4.2 18 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6.4 8.2v2.2M12 9.2v2.4M17.6 8.2v2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="6.4" cy="14.2" r="3.35" fill="currentColor" />
      <circle cx="12" cy="15.4" r="3.35" fill="currentColor" />
      <circle cx="17.6" cy="14.2" r="3.35" fill="currentColor" />
    </Icon>
  );
}
