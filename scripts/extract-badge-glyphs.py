#!/usr/bin/env python3
"""Pull ghost / sensitivity figures off their baked discs."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / "public" / "icons"


def dist(a: tuple[int, ...], b: tuple[int, ...]) -> float:
    return math.sqrt(sum((int(a[i]) - int(b[i])) ** 2 for i in range(3)))


def is_cream(p: tuple[int, ...]) -> bool:
    r, g, b, a = p[:4]
    return a > 80 and r > 175 and g > 150 and b > 110 and (r + g) > 340


def chroma_key(
    im: Image.Image,
    bg: tuple[int, int, int],
    thresh: float = 58,
    softness: float = 22,
) -> Image.Image:
    src = im.convert("RGBA")
    out = Image.new("RGBA", src.size)
    ip, op = src.load(), out.load()
    w, h = src.size
    for y in range(h):
        for x in range(w):
            p = ip[x, y]
            if p[3] < 10:
                op[x, y] = (0, 0, 0, 0)
                continue
            d = dist(p, bg)
            if d < thresh:
                fade = thresh - softness
                alpha = 0 if d <= fade else int(255 * (d - fade) / max(1, softness))
                op[x, y] = (p[0], p[1], p[2], min(p[3], max(0, alpha)))
            else:
                op[x, y] = p
    return out


def trim(im: Image.Image, pad: int = 8) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def extract_disc_glyph(src: Path, dest: Path, bg: tuple[int, int, int], thresh: float = 58) -> None:
    keyed = chroma_key(Image.open(src), bg, thresh=thresh)
    keyed = chroma_key(keyed, bg, thresh=thresh - 8, softness=16)
    trim(keyed, pad=10).save(dest)
    print(f"wrote {dest.name}")


def extract_sensitivity(src: Path, dest: Path, bg: tuple[int, int, int]) -> None:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    radius = min(w, h) * 0.48

    cream_mask = Image.new("L", (w, h), 0)
    slash_mask = Image.new("L", (w, h), 0)
    cm, sm = cream_mask.load(), slash_mask.load()
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if p[3] < 20:
                continue
            if (x - cx) ** 2 + (y - cy) ** 2 > radius * radius:
                continue
            if is_cream(p):
                cm[x, y] = 255
                continue
            nx, ny = x / (w - 1), y / (h - 1)
            if abs(nx - ny) / math.sqrt(2) > 0.11:
                continue
            lum = 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]
            if lum < 100 or (p[0] < 130 and lum < 140 and dist(p, bg) > 18):
                sm[x, y] = 255

    cream_d = cream_mask.filter(ImageFilter.MaxFilter(9))
    cd = cream_d.load()
    out = im.copy()
    op = out.load()
    smp = slash_mask.load()
    for y in range(h):
        for x in range(w):
            if smp[x, y] < 128:
                continue
            if cd[x, y] > 128:
                found = None
                for rad in range(1, 14):
                    for dy in range(-rad, rad + 1):
                        for dx in range(-rad, rad + 1):
                            xx, yy = x + dx, y + dy
                            if 0 <= xx < w and 0 <= yy < h and cream_mask.getpixel((xx, yy)) > 128:
                                found = px[xx, yy]
                                break
                        if found:
                            break
                    if found:
                        break
                op[x, y] = found if found else (248, 232, 196, 255)
            else:
                op[x, y] = (*bg, 255)

    keyed = chroma_key(out, bg, thresh=48, softness=14)
    kp = keyed.load()
    for y in range(keyed.height):
        for x in range(keyed.width):
            p = kp[x, y]
            if p[3] < 40:
                kp[x, y] = (0, 0, 0, 0)
            elif not is_cream(p) and dist(p, bg) < 70 and p[3] < 200:
                kp[x, y] = (0, 0, 0, 0)
    trim(keyed, pad=8).save(dest)
    print(f"wrote {dest.name}")


def extract_medium_ghost() -> None:
    src = ROOT / "scare-ghost-disc-medium.png"
    keyed = chroma_key(Image.open(src), (242, 120, 1), thresh=92, softness=20)
    px = keyed.load()
    body = (18, 9, 31)
    for y in range(keyed.height):
        for x in range(keyed.width):
            p = px[x, y]
            if p[3] < 20:
                continue
            if p[0] > 160 and 70 < p[1] < 180 and p[2] < 60:
                px[x, y] = (body[0], body[1], body[2], p[3])
    trim(keyed, pad=6).save(ROOT / "scare-ghost-medium.png")
    print("wrote scare-ghost-medium.png")


def main() -> None:
    extract_disc_glyph(ROOT / "scare-ghost-disc-mild.png", ROOT / "scare-ghost-mild.png", (3, 111, 69), 62)
    extract_medium_ghost()
    extract_disc_glyph(ROOT / "scare-ghost-disc-spicy.png", ROOT / "scare-ghost-spicy.png", (164, 15, 19), 62)
    terracotta = (158, 65, 13)
    extract_sensitivity(ROOT / "sensitivity-gluten.png", ROOT / "sensitivity-gluten-glyph.png", terracotta)
    extract_sensitivity(ROOT / "sensitivity-nuts.png", ROOT / "sensitivity-nuts-glyph.png", terracotta)
    extract_sensitivity(ROOT / "sensitivity-sesame.png", ROOT / "sensitivity-sesame-glyph.png", terracotta)


if __name__ == "__main__":
    main()
