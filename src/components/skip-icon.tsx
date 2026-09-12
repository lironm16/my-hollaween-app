/** Skip-forward icon: filled triangle + thick bar with rounded caps (⏭ style). */
export const skipIconPaths = {
  triangle: "M3.75 3.5 14.25 12 3.75 20.5Z",
  bar: { x: 15.25, y: 3.5, width: 5, height: 17, rx: 2.5 },
} as const;

function skipIconMarkup(fill: string) {
  const { bar } = skipIconPaths;
  return `<path fill="${fill}" d="${skipIconPaths.triangle}"/><rect fill="${fill}" x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" rx="${bar.rx}"/>`;
}

export function SkipGlyph({
  fill = "currentColor",
}: {
  fill?: string;
}) {
  const { bar } = skipIconPaths;
  return (
    <>
      <path fill={fill} d={skipIconPaths.triangle} />
      <rect fill={fill} x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx={bar.rx} />
    </>
  );
}

export function SkipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <SkipGlyph />
    </svg>
  );
}

export const SKIP_ICON_SVG = `<svg class="pin-skip-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${skipIconMarkup("#fff")}</svg>`;

export const SKIP_ICON_DATA_URI = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${skipIconMarkup("#fff")}</svg>`,
)}`;
