function BatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 40" aria-hidden className={className} fill="currentColor">
      <path d="M40 8c-8 0-14 5-16 12-3-2-7-3-11-2-4 8-2 17 4 22 3-6 9-10 16-10s13 4 16 10c6-5 8-14 4-22-4-1-8 0-11 2C54 13 48 8 40 8Z" />
      <path d="M28 14c-4 2-7 6-8 10 2-1 4-1 6 0 1-3 4-5 7-5 1 0 2 0 3 1 3 0 6 2 7 5 2-1 4-1 6 0-1-4-4-8-8-10-2 1-4 1-6-1-2 2-4 3-7 0Z" opacity="0.35" />
    </svg>
  );
}

/** Bats across the top + one hero pumpkin — static decor, no photo backgrounds. */
export function CountdownDecor() {
  return (
    <div className="countdown-decor pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="countdown-decor__moon" />
      <BatIcon className="countdown-decor__bat-fly countdown-decor__bat-fly--1" />
      <BatIcon className="countdown-decor__bat-fly countdown-decor__bat-fly--2" />
      <BatIcon className="countdown-decor__bat-fly countdown-decor__bat-fly--3" />
      <span className="countdown-decor__pumpkin">🎃</span>
    </div>
  );
}
