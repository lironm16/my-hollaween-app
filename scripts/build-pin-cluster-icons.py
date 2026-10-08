#!/usr/bin/env python3
"""Compose tight twin glyphs for circular building cluster map pins."""

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

CANVAS = 64
GAP = 1


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


def max_pair_glyph_h(left: Image.Image, right: Image.Image, cw: int, ch: int, gap: int) -> int:
    for gh in range(ch, 0, -1):
        left_r = resize_glyph(left, gh)
        right_r = resize_glyph(right, gh)
        if left_r.width + gap + right_r.width <= cw and gh <= ch:
            return gh
    return 1


def max_half_glyph_h(left: Image.Image, right: Image.Image, cw: int, ch: int) -> int:
    half = cw // 2
    for gh in range(ch, 0, -1):
        left_r = resize_glyph(left, gh)
        right_r = resize_glyph(right, gh)
        if left_r.width <= half and right_r.width <= half and gh <= ch:
            return gh
    return 1


def compose_pair(
    left: Image.Image,
    right: Image.Image,
    canvas: int,
    *,
    gap: int,
) -> Image.Image:
    cw = ch = canvas
    gh = max_pair_glyph_h(left, right, cw, ch, gap)
    out = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    left_r = resize_glyph(left, gh)
    right_r = resize_glyph(right, gh)
    total_w = left_r.width + gap + right_r.width
    x0 = (cw - total_w) // 2
    y0 = (ch - gh) // 2
    out.alpha_composite(left_r, (x0, y0))
    out.alpha_composite(right_r, (x0 + left_r.width + gap, y0))
    return out


def compose_mixed_halves(ghost: Image.Image, pumpkin: Image.Image, canvas: int) -> Image.Image:
    cw = ch = canvas
    gh = max_half_glyph_h(ghost, pumpkin, cw, ch)
    out = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    half = cw // 2
    ghost_r = resize_glyph(ghost, gh)
    pump_r = resize_glyph(pumpkin, gh)
    y0 = (ch - gh) // 2
    out.alpha_composite(ghost_r, ((half - ghost_r.width) // 2, y0))
    out.alpha_composite(pump_r, (half + (half - pump_r.width) // 2, y0))
    return out


def build() -> None:
    ghost = trim(Image.open(GHOST).convert("RGBA"))
    pumpkin = trim(Image.open(PUMPKIN).convert("RGBA"))
    for key, pair in (
        ("houses", (ghost, ghost)),
        ("businesses", (pumpkin, pumpkin)),
    ):
        left, right = pair
        im = compose_pair(left, right, CANVAS, gap=GAP)
        im.save(OUT_1X[key], optimize=True)
        im2 = compose_pair(left, right, CANVAS * 2, gap=GAP * 2)
        im2.save(OUT_2X[key], optimize=True)
        print("wrote", OUT_1X[key].name, OUT_2X[key].name)

    mixed = compose_mixed_halves(ghost, pumpkin, CANVAS)
    mixed.save(OUT_1X["mixed"], optimize=True)
    mixed2 = compose_mixed_halves(ghost, pumpkin, CANVAS * 2)
    mixed2.save(OUT_2X["mixed"], optimize=True)
    print("wrote", OUT_1X["mixed"].name, OUT_2X["mixed"].name)


def main() -> None:
    build()


if __name__ == "__main__":
    main()
