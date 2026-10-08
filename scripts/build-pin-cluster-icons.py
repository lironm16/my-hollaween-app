#!/usr/bin/env python3
"""Compose twin-ghost / twin-pumpkin / mixed building cluster map icons."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "icons"
GHOST = ROOT / "pin-scare-mild.png"
PUMPKIN = ROOT / "pin-poi-medium.png"

OUT_1X = {
    "houses": ROOT / "pin-cluster-ghosts.png",
    "businesses": ROOT / "pin-cluster-pumpkins.png",
    "mixed": ROOT / "pin-cluster-mixed.png",
}
OUT_2X = {
    "houses": ROOT / "pin-cluster-ghosts@2x.png",
    "businesses": ROOT / "pin-cluster-pumpkins@2x.png",
    "mixed": ROOT / "pin-cluster-mixed@2x.png",
}


def alpha_bbox(im: Image.Image, min_alpha: int = 16) -> tuple[int, int, int, int]:
    px = im.load()
    w, h = im.size
    xs: list[int] = []
    ys: list[int] = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] >= min_alpha:
                xs.append(x)
                ys.append(y)
    if not xs:
        return (0, 0, w, h)
    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1)


def trim(im: Image.Image) -> Image.Image:
    box = alpha_bbox(im)
    return im.crop(box)


def resize_glyph(im: Image.Image, target_h: int) -> Image.Image:
    w, h = im.size
    scale = target_h / h
    nw = max(1, int(w * scale))
    nh = max(1, int(h * scale))
    return im.resize((nw, nh), Image.Resampling.LANCZOS)


def compose_pair(
    left: Image.Image,
    right: Image.Image,
    canvas: tuple[int, int],
    *,
    gap: int,
    glyph_height_ratio: float,
) -> Image.Image:
    cw, ch = canvas
    out = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    lh = int(ch * glyph_height_ratio)
    left_r = resize_glyph(left, lh)
    right_r = resize_glyph(right, lh)
    total_w = left_r.width + gap + right_r.width
    x0 = max(0, (cw - total_w) // 2)
    y0 = (ch - lh) // 2
    out.alpha_composite(left_r, (x0, y0))
    out.alpha_composite(right_r, (x0 + left_r.width + gap, y0))
    return out


def build() -> None:
    ghost = trim(Image.open(GHOST).convert("RGBA"))
    pumpkin = trim(Image.open(PUMPKIN).convert("RGBA"))
    specs: dict[str, tuple[tuple[int, int], int, float, tuple[Image.Image, Image.Image]]] = {
        "houses": ((84, 50), 8, 0.78, (ghost, ghost)),
        "businesses": ((84, 50), 8, 0.78, (pumpkin, pumpkin)),
        "mixed": ((92, 50), 10, 0.76, (ghost, pumpkin)),
    }
    for key, (canvas, gap, ratio, pair) in specs.items():
        left, right = pair
        im = compose_pair(left, right, canvas, gap=gap, glyph_height_ratio=ratio)
        im.save(OUT_1X[key], optimize=True)
        cw, ch = canvas
        im2 = compose_pair(
            left,
            right,
            (cw * 2, ch * 2),
            gap=gap * 2,
            glyph_height_ratio=ratio,
        )
        im2.save(OUT_2X[key], optimize=True)
        print("wrote", OUT_1X[key].name, OUT_2X[key].name)


def main() -> None:
    build()


if __name__ == "__main__":
    main()
