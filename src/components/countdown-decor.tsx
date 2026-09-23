function BatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 48" aria-hidden className={className} fill="currentColor">
      <path d="M48 6c-10 0-18 6-20 15-4-2-9-4-14-2-5 10-2 22 6 28 4-8 11-13 20-13s16 5 20 13c8-6 11-18 6-28-5-2-10 0-14 2C66 12 58 6 48 6Z" />
    </svg>
  );
}

/** Big bats across the top + one hero pumpkin. */
export function CountdownDecor() {
  return (
    <div className="countdown-decor pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      <div className="countdown-decor__moon" />
      <BatIcon className="countdown-decor__bat-fly countdown-decor__bat-fly--1" />
      <BatIcon className="countdown-decor__bat-fly countdown-decor__bat-fly--2" />
      <BatIcon className="countdown-decor__bat-fly countdown-decor__bat-fly--3" />
      <span className="countdown-decor__pumpkin">🎃</span>
    </div>
  );
}
