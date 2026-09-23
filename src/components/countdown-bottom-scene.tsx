"use client";

const GROUND_PROPS = ["🎃", "⚰️", "🕸️", "🍬", "👻", "🎃"] as const;

/** Static ground strip between date badge and close CTA — trial decor. */
export function CountdownBottomScene() {
  return (
    <div className="countdown-bottom-scene" aria-hidden>
      <div className="countdown-ground-hill" />
      <div className="countdown-ground-props">
        {GROUND_PROPS.map((icon, index) => (
          <span key={`${icon}-${index}`} className={`countdown-ground-prop countdown-ground-prop--${index + 1}`}>
            {icon}
          </span>
        ))}
      </div>
    </div>
  );
}
