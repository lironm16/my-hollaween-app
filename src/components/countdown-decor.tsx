"use client";

const BAT_COUNT = 10;

/** Bottom fog + flying bat emojis — right to left, no rotation. */
export function CountdownDecor() {
  return (
    <div className="countdown-decor-layer pointer-events-none absolute inset-0 z-[6] overflow-hidden" aria-hidden>
      <div className="countdown-scene-fog" />
      <div className="countdown-decor relative size-full">
        {Array.from({ length: BAT_COUNT }, (_, index) => (
          <span
            key={`bat-${index + 1}`}
            className={`countdown-decor__bat-emoji countdown-decor__bat-emoji--${index + 1}`}
          >
            🦇
          </span>
        ))}
      </div>
    </div>
  );
}
