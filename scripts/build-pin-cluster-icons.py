#!/usr/bin/env python3
"""Compose vertical twin-ghost / twin-pumpkin / mixed building cluster map icons."""

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


def compose_stack(
    top: Image.Image,
    bottom: Image.Image,
    canvas: tuple[int, int],
    *,
    gap: int,
    glyph_height_ratio: float,
) -> Image.Image:
    cw, ch = canvas
    out = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    gh = int(ch * glyph_height_ratio)
    top_r = resize_glyph(top, gh)
    bottom_r = resize_glyph(bottom, gh)
    total_h = top_r.height + gap + bottom_r.height
    y0 = max(0, (ch - total_h) // 2)
    x_top = (cw - top_r.width) // 2
    x_bottom = (cw - bottom_r.width) // 2
    out.alpha_composite(top_r, (x_top, y0))
    out.alpha_composite(bottom_r, (x_bottom, y0 + top_r.height + gap))
    return out


def build() -> None:
    ghost = trim(Image.open(GHOST).convert("RGBA"))
    pumpkin = trim(Image.open(PUMPKIN).convert("RGBA"))
    canvas = (48, 72)
    gap = 4
    ratio = 0.36
    stacks: dict[str, tuple[Image.Image, Image.Image]] = {
        "houses": (ghost, ghost),
        "businesses": (pumpkin, pumpkin),
        "mixed": (ghost, pumpkin),
    }
    for key, (top, bottom) in stacks.items():
        im = compose_stack(top, bottom, canvas, gap=gap, glyph_height_ratio=ratio)
        im.save(OUT_1X[key], optimize=True)
        cw, ch = canvas
        im2 = compose_stack(top, bottom, (cw * 2, ch * 2), gap=gap * 2, glyph_height_ratio=ratio)
        im2.save(OUT_2X[key], optimize=True)
        print("wrote", OUT_1X[key].name, OUT_2X[key].name)


def main() -> None:
    build()


if __name__ == "__main__":
    main()
