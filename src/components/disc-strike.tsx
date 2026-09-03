/** Diagonal strike for “none / off” disc badges. Drawn in SVG so RTL can’t offset it. */
export function DiscStrike() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      className="pointer-events-none absolute inset-0"
    >
      <line
        x1="7"
        y1="25"
        x2="25"
        y2="7"
        stroke="#1c0e24"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
