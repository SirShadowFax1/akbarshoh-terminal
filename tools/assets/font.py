"""Subset JetBrains Mono to the characters the site uses and write woff2.

Get the official release from github.com/JetBrains/JetBrainsMono/releases,
unzip it, then run from the repo root:
  uv run --with-requirements tools/assets/requirements.txt tools/assets/font.py <unzipped-release-dir>
"""
from pathlib import Path
import shutil
import sys

from fontTools import subset

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "assets" / "fonts"

UNICODES = [
    *range(0x20, 0x7F),  # ASCII
    *range(0xA0, 0x100),  # Latin-1 supplement
    0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026,  # punctuation
    0x2190, 0x2191, 0x2192, 0x2193,  # arrows
    *range(0x2500, 0x25A0),  # box drawing and block elements
    0x25B8, 0x25CF, 0x2713, 0x2717,  # ▸ ● ✓ ✗
]


def build(src, dst):
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = []  # no code ligatures in a terminal
    options.hinting = False
    options.desubroutinize = True
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6]
    options.notdef_outline = True
    font = subset.load_font(str(src), options)
    sub = subset.Subsetter(options)
    sub.populate(unicodes=UNICODES)
    sub.subset(font)
    subset.save_font(font, str(dst), options)
    missing = [hex(u) for u in UNICODES if u not in font.getBestCmap()]
    print(f"{dst.name}: {dst.stat().st_size} bytes, missing glyphs: {missing or 'none'}")


def main():
    release = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for weight in ("Regular", "Bold"):
        src = next(release.rglob(f"JetBrainsMono-{weight}.ttf"))
        build(src, OUT / f"jetbrains-mono-{weight.lower()}.woff2")
    shutil.copy(next(release.rglob("OFL.txt")), OUT / "OFL.txt")


if __name__ == "__main__":
    main()
