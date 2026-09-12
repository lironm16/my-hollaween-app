/** Skip-forward icon: filled triangle + thick bar with rounded caps (⏭ style). */
export const skipIconPaths = {
  triangle: "M3.5 5 12.5 12 3.5 19Z",
  bar: { x: 13.75, y: 5, width: 4.25, height: 14, rx: 2.125 },
} as const;

function skipIconMarkup(fill: string) {
  const { bar } = skipIconPaths;
  return `<path fill="${fill}" d="${skipIconPaths.triangle}"/><rect fill="${fill}" x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" rx="${bar.rx}"/>`;
}

export function SkipIcon({ className }: { className?: string }) {
  const { bar } = skipIconPaths;
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d={skipIconPaths.triangle} />
      <rect fill="currentColor" x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx={bar.rx} />
    </svg>
  );
}

export const SKIP_ICON_SVG = `<svg class="pin-skip-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">${skipIconMarkup("#fff")}</svg>`;

export const SKIP_ICON_DATA_URI = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${skipIconMarkup("#fff")}</svg>`,
)}`;
