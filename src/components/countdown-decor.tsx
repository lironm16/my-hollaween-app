"use client";

const TOP_BAT_COUNT = 6;

/** Lighter bottom swarm — fewer bats in the fog band. */
const BOTTOM_BATS: Array<{
  top: string;
  size: string;
  opacity: number;
  duration: number;
  delay: number;
}> = [
  { top: "68%", size: "clamp(1.35rem, 5.8vw, 2rem)", opacity: 0.52, duration: 18, delay: -4 },
  { top: "72%", size: "clamp(1.15rem, 4.8vw, 1.7rem)", opacity: 0.48, duration: 22, delay: -9 },
  { top: "76%", size: "clamp(1.55rem, 6.8vw, 2.25rem)", opacity: 0.5, duration: 16, delay: -2 },
  { top: "80%", size: "clamp(1rem, 4.2vw, 1.5rem)", opacity: 0.44, duration: 24, delay: -14 },
  { top: "84%", size: "clamp(1.45rem, 6.2vw, 2.1rem)", opacity: 0.46, duration: 19, delay: -7 },
  { top: "88%", size: "clamp(1.25rem, 5.2vw, 1.85rem)", opacity: 0.42, duration: 21, delay: -11 },
  { top: "91%", size: "clamp(1.6rem, 7vw, 2.35rem)", opacity: 0.4, duration: 15, delay: -5 },
  { top: "94%", size: "clamp(1.05rem, 4.4vw, 1.55rem)", opacity: 0.36, duration: 26, delay: -18 },
];

/** Bottom fog + flying bat emojis — right to left, no rotation. */
export function CountdownDecor() {
  return (
    <div className="countdown-decor-layer pointer-events-none absolute inset-0 z-[6] overflow-hidden" aria-hidden>
      <div className="countdown-scene-fog" />
      <div className="countdown-decor relative size-full">
        {Array.from({ length: TOP_BAT_COUNT }, (_, index) => (
          <span
            key={`bat-top-${index + 1}`}
            className={`countdown-decor__bat-emoji countdown-decor__bat-emoji--${index + 1}`}
          >
            🦇
          </span>
        ))}
        {BOTTOM_BATS.map((bat, index) => (
          <span
            key={`bat-bottom-${index + 1}`}
            className="countdown-decor__bat-emoji countdown-decor__bat-emoji--bottom"
            style={{
              top: bat.top,
              fontSize: bat.size,
              opacity: bat.opacity,
              animationDuration: `${bat.duration}s`,
              animationDelay: `${bat.delay}s`,
            }}
          >
            🦇
          </span>
        ))}
      </div>
    </div>
  );
}
