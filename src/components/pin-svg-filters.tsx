/** SVG filters for map pin glyphs (dark PNG features → white eyes/mouth). */
export function PinSvgFilters() {
  return (
    <svg
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="hw-pin-inner-white" colorInterpolationFilters="sRGB">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="
              0 0 0 0 1
              0 0 0 0 1
              0 0 0 0 1
              -1 -1 -1 0 2"
          />
        </filter>
      </defs>
    </svg>
  );
}
