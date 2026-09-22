#!/usr/bin/env python3
"""Build sensitivity-vegan.png + glyph from the master badge art.

The disc art lives at public/icons/sensitivity-vegan.png (256×256, same set as
gluten/nuts/sesame). Re-run this script after replacing that PNG.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "icons"


def is_cream(p: tuple[int, ...]) -> bool:
    r, g, b, a = p[:4]
    return a > 80 and r > 175 and g > 150 and b > 110 and (r + g) > 340


def is_leaf_pixel(p: tuple[int, ...]) -> bool:
    if p[3] < 30:
        return False
    r, g, b = p[:3]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if lum < 95:
        return False
    if r > 130 and g > 110 and b > 80 and (r + g) > 280:
        return True
    return is_cream(p)


def opaque_bbox(im: Image.Image, min_alpha: int = 24) -> tuple[int, int, int, int] | None:
    px = im.load()
    w, h = im.size
    minx, miny, maxx, maxy = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            if px[x, y][3] <= min_alpha:
                continue
            found = True
            minx = min(minx, x)
            miny = min(miny, y)
            maxx = max(maxx, x)
            maxy = max(maxy, y)
    if not found:
        return None
    return minx, miny, maxx + 1, maxy + 1


def trim(im: Image.Image, pad: int = 8) -> Image.Image:
    bbox = opaque_bbox(im)
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def extract_vegan_glyph(disc_path: Path, dest: Path) -> None:
    im = Image.open(disc_path).convert("RGBA")
    w, h = im.size
    px = im.load()
    cx = cy = (w - 1) / 2.0
    radius = min(w, h) * 0.48
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()

    for y in range(h):
        for x in range(w):
            if (x - cx) ** 2 + (y - cy) ** 2 > radius * radius:
                continue
            nx, ny = x / (w - 1), y / (h - 1)
            if abs(nx - ny) / math.sqrt(2) <= 0.055:
                continue
            p = px[x, y]
            if is_leaf_pixel(p):
                op[x, y] = p

    trim(out, pad=8).save(dest)
    print(f"wrote {dest.name}")


def main() -> None:
    disc = ROOT / "sensitivity-vegan.png"
    if not disc.exists():
        raise SystemExit(f"missing {disc}")
    extract_vegan_glyph(disc, ROOT / "sensitivity-vegan-glyph.png")


if __name__ == "__main__":
    main()
