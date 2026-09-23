"use client";

/** Flying bat emojis — right to left, no rotation. */
export function CountdownDecor() {
  return (
    <div className="countdown-decor pointer-events-none absolute inset-0 z-[8] overflow-hidden" aria-hidden>
      {[1, 2, 3, 4, 5, 6].map((index) => (
        <span key={`bat-${index}`} className={`countdown-decor__bat-emoji countdown-decor__bat-emoji--${index}`}>
          🦇
        </span>
      ))}
    </div>
  );
}
