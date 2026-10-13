"""Cut the profile photo out of its background and build the ASCII portrait.

The source photo is 200 x 200 with other people at both edges. A square crop
that keeps the whole head still reaches them, so the subject is traced with a
polygon (source pixel coordinates) and everything outside it is replaced with
the site's background colour.

Run from the repo root:
  uv run --with-requirements tools/assets/requirements.txt tools/assets/photo.py
Prints the ASCII portrait for `portrait` in public/js/content.js.
"""
from pathlib import Path
import io

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "originals" / "Photo.ha.jpg"
OUT = ROOT / "public" / "assets" / "photo"

BG = (10, 13, 11)  # --bg in index.html
CROP = (36, 4, 176, 144)  # square window, source pixels
SUBJECT = [
    (92, 7), (106, 4), (122, 7), (138, 13), (150, 23), (157, 37), (160, 55), (160, 74),
    (160, 90), (158, 106), (151, 115), (141, 120), (136, 128), (134, 138), (135, 152),
    (73, 152), (74, 142), (72, 132), (68, 121), (65, 110), (63, 98), (61, 86),
    (54, 74), (52, 63), (57, 55), (62, 44), (66, 32), (72, 21), (81, 12),
]
FEATHER = 2
SUPERSAMPLE = 4

ASCII_COLS = 40
ASCII_RAMP = " .,:;i1tfLCG08@"  # dark to bright
ASCII_FLOOR = 0.05  # keeps dark hair visible inside the silhouette
ASCII_GAMMA = 1.2


def subject_mask(size):
    s = SUPERSAMPLE
    big = Image.new("L", (size[0] * s, size[1] * s), 0)
    ImageDraw.Draw(big).polygon([(x * s, y * s) for x, y in SUBJECT], fill=255)
    big = big.filter(ImageFilter.GaussianBlur(FEATHER * s / 2))
    return big.resize(size, Image.LANCZOS)


def portrait_image():
    src = Image.open(SRC).convert("RGB")
    mask = subject_mask(src.size)
    out = Image.new("RGB", src.size, BG)
    out.paste(src, (0, 0), mask)
    return out.crop(CROP), mask.crop(CROP)


def save(img, path, fmt, **opts):
    # A fresh RGB image carries no EXIF, XMP or ICC data into the encoder.
    clean = Image.new("RGB", img.size)
    clean.paste(img)
    buf = io.BytesIO()
    clean.save(buf, fmt, **opts)
    path.write_bytes(buf.getvalue())


def ascii_portrait(img, mask):
    # Character cells are about twice as tall as wide.
    rows = round(ASCII_COLS * img.height / img.width / 2)
    solid = mask.point(lambda v: 255 if v > 128 else 0)
    gray = ImageOps.autocontrast(img.convert("L"), cutoff=1, mask=solid)
    gray = gray.resize((ASCII_COLS * 4, rows * 4), Image.LANCZOS).filter(ImageFilter.BoxBlur(1))
    gray = gray.resize((ASCII_COLS, rows), Image.LANCZOS)
    m = mask.resize((ASCII_COLS, rows), Image.LANCZOS)
    lines = []
    for y in range(rows):
        row = ""
        for x in range(ASCII_COLS):
            if m.getpixel((x, y)) < 110:
                row += " "
                continue
            v = ASCII_FLOOR + (1 - ASCII_FLOOR) * (gray.getpixel((x, y)) / 255) ** ASCII_GAMMA
            row += ASCII_RAMP[min(len(ASCII_RAMP) - 1, int(v * len(ASCII_RAMP)))]
        lines.append(row.rstrip())
    while lines and not lines[-1]:
        lines.pop()
    return "\n".join(lines)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    img, mask = portrait_image()
    save(img, OUT / "akbarshoh.webp", "WEBP", quality=88, method=6)
    save(img, OUT / "akbarshoh.avif", "AVIF", quality=72)
    for p in sorted(OUT.iterdir()):
        print(f"{p.name}: {img.width}x{img.height} {p.stat().st_size} bytes")
    print(ascii_portrait(img, mask))


if __name__ == "__main__":
    main()
