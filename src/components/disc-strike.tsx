/**
 * Thin full-diameter strike for “none / off” and allergen discs.
 * Same \ as the original terracotta photos, drawn to the rim, thinner than the PNG.
 * SVG coords stay LTR so `dir="rtl"` cannot flip the slash.
 */
export function DiscStrike() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
      style={{ direction: "ltr" }}
    >
      <line
        x1="-2"
        y1="-2"
        x2="34"
        y2="34"
        stroke="#1c0e24"
        strokeWidth="1.5"
        strokeLinecap="butt"
      />
    </svg>
  );
}
