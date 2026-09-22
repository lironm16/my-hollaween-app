#!/usr/bin/env python3
"""Build sensitivity-vegan-glyph.png from the master figure art."""

from __future__ import annotations

import importlib.util
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "public" / "icons"
SRC = ROOT / "sensitivity-vegan-glyph-src.png"
TERRACOTTA = (158, 65, 13)
def load_extract_mod():
    spec = importlib.util.spec_from_file_location(
        "extract", Path(__file__).resolve().parent / "extract-badge-glyphs.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def build_glyph(dest: Path) -> Image.Image:
    mod = load_extract_mod()
    im = Image.open(SRC).convert("RGBA")
    for bg in ((255, 255, 255), (250, 250, 250), (240, 240, 240)):
        im = mod.chroma_key(im, bg, thresh=40, softness=20)
    trimmed = mod.trim(im, pad=2)
    ref = Image.open(ROOT / "sensitivity-gluten-glyph.png")
    scale = min(ref.width / trimmed.width, ref.height / trimmed.height) * 0.96
    new_w = max(1, int(trimmed.width * scale))
    new_h = max(1, int(trimmed.height * scale))
    scaled = trimmed.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", ref.size, (0, 0, 0, 0))
    canvas.paste(scaled, ((ref.width - new_w) // 2, (ref.height - new_h) // 2), scaled)
    canvas.save(dest)
    return canvas


def build_disc(glyph: Image.Image, dest: Path) -> None:
    disc = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    draw = ImageDraw.Draw(disc)
    draw.ellipse((6, 6, 250, 250), fill=(*TERRACOTTA, 255))
    g = glyph.resize(
        (int(256 * 0.72), int(256 * 0.72 * glyph.height / glyph.width)),
        Image.Resampling.LANCZOS,
    )
    disc.paste(g, ((256 - g.width) // 2, (256 - g.height) // 2), g)
    disc.save(dest)


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"missing {SRC}")
    glyph = build_glyph(ROOT / "sensitivity-vegan-glyph.png")
    build_disc(glyph, ROOT / "sensitivity-vegan.png")
    print("wrote sensitivity-vegan-glyph.png + sensitivity-vegan.png")


if __name__ == "__main__":
    main()
