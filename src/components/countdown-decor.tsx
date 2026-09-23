/** Halloween props around the countdown sign — inspired by poster art, no photo backgrounds. */
export function CountdownDecor() {
  return (
    <div className="countdown-decor pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="countdown-decor__moon" />
      <span className="countdown-decor__bat countdown-decor__bat--1">🦇</span>
      <span className="countdown-decor__bat countdown-decor__bat--2">🦇</span>
      <span className="countdown-decor__bat countdown-decor__bat--3">🦇</span>
      <span className="countdown-decor__ghost">👻</span>
      <span className="countdown-decor__pumpkin countdown-decor__pumpkin--tl">🎃</span>
      <span className="countdown-decor__pumpkin countdown-decor__pumpkin--tr">🎃</span>
      <span className="countdown-decor__pumpkin countdown-decor__pumpkin--bl">🎃</span>
      <span className="countdown-decor__pumpkin countdown-decor__pumpkin--br">🎃</span>
      <span className="countdown-decor__lantern countdown-decor__lantern--l">🏮</span>
      <span className="countdown-decor__lantern countdown-decor__lantern--r">🏮</span>
    </div>
  );
}
