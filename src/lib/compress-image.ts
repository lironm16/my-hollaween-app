export type PhotoFocus = { x: number; y: number };

function clampFocus(value: number) {
  return Math.min(100, Math.max(0, value));
}

/** Square cover crop matching CSS object-fit:cover + object-position. */
export function coverCropRect(
  width: number,
  height: number,
  focus: PhotoFocus = { x: 50, y: 50 },
) {
  const side = Math.min(width, height);
  const x = width > height ? (clampFocus(focus.x) / 100) * (width - height) : 0;
  const y = height > width ? (clampFocus(focus.y) / 100) * (height - width) : 0;
  return { x, y, size: Math.max(1, side) };
}

/** Browser-only JPEG shrink for house photos. Crops to the card’s square frame. */
export async function compressJpegFile(file: File, focus: PhotoFocus = { x: 50, y: 50 }) {
  const bmp = await createImageBitmap(file);
  const crop = coverCropRect(bmp.width, bmp.height, focus);
  const canvas = document.createElement("canvas");
  const max = 960;
  const out = Math.max(1, Math.min(max, crop.size));
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bmp, crop.x, crop.y, crop.size, crop.size, 0, 0, out, out);
  let quality = 0.72;
  let data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > 140_000 && quality > 0.38) {
    quality -= 0.08;
    data = canvas.toDataURL("image/jpeg", quality);
  }
  return data;
}
