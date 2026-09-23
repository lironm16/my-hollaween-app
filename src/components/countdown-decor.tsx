"use client";

const TOP_BAT_COUNT = 10;

/** Extra swarm — dense band in the lower half (above close CTA, inside fog). */
const BOTTOM_BATS: Array<{
  top: string;
  size: string;
  opacity: number;
  duration: number;
  delay: number;
}> = [
  { top: "53%", size: "clamp(1.15rem, 4.8vw, 1.75rem)", opacity: 0.62, duration: 12, delay: -1 },
  { top: "56%", size: "clamp(1.45rem, 6.2vw, 2.1rem)", opacity: 0.58, duration: 15, delay: -4 },
  { top: "58%", size: "clamp(1.05rem, 4.5vw, 1.55rem)", opacity: 0.52, duration: 18, delay: -7 },
  { top: "60%", size: "clamp(1.65rem, 7vw, 2.35rem)", opacity: 0.6, duration: 14, delay: -2 },
  { top: "62%", size: "clamp(1.2rem, 5vw, 1.85rem)", opacity: 0.55, duration: 20, delay: -9 },
  { top: "64%", size: "clamp(1.5rem, 6.5vw, 2.2rem)", opacity: 0.5, duration: 16, delay: -5 },
  { top: "66%", size: "clamp(1rem, 4.2vw, 1.5rem)", opacity: 0.48, duration: 22, delay: -11 },
  { top: "68%", size: "clamp(1.75rem, 7.2vw, 2.45rem)", opacity: 0.56, duration: 13, delay: -3 },
  { top: "70%", size: "clamp(1.25rem, 5.2vw, 1.9rem)", opacity: 0.54, duration: 19, delay: -8 },
  { top: "72%", size: "clamp(1.4rem, 6vw, 2.05rem)", opacity: 0.5, duration: 17, delay: -6 },
  { top: "74%", size: "clamp(1.55rem, 6.8vw, 2.25rem)", opacity: 0.52, duration: 21, delay: -12 },
  { top: "76%", size: "clamp(1.1rem, 4.6vw, 1.65rem)", opacity: 0.46, duration: 15, delay: -4 },
  { top: "78%", size: "clamp(1.35rem, 5.8vw, 2rem)", opacity: 0.5, duration: 24, delay: -15 },
  { top: "80%", size: "clamp(1.6rem, 7vw, 2.3rem)", opacity: 0.48, duration: 18, delay: -7 },
  { top: "81%", size: "clamp(1rem, 4vw, 1.45rem)", opacity: 0.44, duration: 26, delay: -18 },
  { top: "83%", size: "clamp(1.45rem, 6.2vw, 2.15rem)", opacity: 0.5, duration: 14, delay: -2 },
  { top: "85%", size: "clamp(1.2rem, 5vw, 1.8rem)", opacity: 0.46, duration: 20, delay: -10 },
  { top: "86%", size: "clamp(1.7rem, 7.5vw, 2.5rem)", opacity: 0.52, duration: 16, delay: -5 },
  { top: "88%", size: "clamp(1.05rem, 4.4vw, 1.55rem)", opacity: 0.42, duration: 23, delay: -14 },
  { top: "89%", size: "clamp(1.3rem, 5.5vw, 1.95rem)", opacity: 0.45, duration: 19, delay: -8 },
  { top: "91%", size: "clamp(1.5rem, 6.4vw, 2.2rem)", opacity: 0.4, duration: 25, delay: -16 },
  { top: "92%", size: "clamp(1.15rem, 4.8vw, 1.7rem)", opacity: 0.38, duration: 17, delay: -6 },
  { top: "54%", size: "clamp(0.95rem, 3.8vw, 1.35rem)", opacity: 0.5, duration: 11, delay: -0.5 },
  { top: "57%", size: "clamp(1.8rem, 7.8vw, 2.6rem)", opacity: 0.55, duration: 27, delay: -20 },
  { top: "63%", size: "clamp(1rem, 4.3vw, 1.5rem)", opacity: 0.47, duration: 13, delay: -1.5 },
  { top: "67%", size: "clamp(1.35rem, 5.6vw, 1.95rem)", opacity: 0.51, duration: 16, delay: -9.5 },
  { top: "71%", size: "clamp(0.9rem, 3.6vw, 1.3rem)", opacity: 0.45, duration: 10, delay: -3.5 },
  { top: "75%", size: "clamp(1.55rem, 6.6vw, 2.25rem)", opacity: 0.49, duration: 22, delay: -13 },
  { top: "79%", size: "clamp(1.1rem, 4.5vw, 1.6rem)", opacity: 0.44, duration: 14, delay: -6.5 },
  { top: "84%", size: "clamp(1.25rem, 5.1vw, 1.85rem)", opacity: 0.43, duration: 18, delay: -11.5 },
  { top: "87%", size: "clamp(1.65rem, 7vw, 2.35rem)", opacity: 0.47, duration: 21, delay: -17 },
  { top: "90%", size: "clamp(0.95rem, 3.9vw, 1.4rem)", opacity: 0.4, duration: 12, delay: -4.5 },
  { top: "93%", size: "clamp(1.4rem, 6vw, 2rem)", opacity: 0.36, duration: 24, delay: -19 },
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
