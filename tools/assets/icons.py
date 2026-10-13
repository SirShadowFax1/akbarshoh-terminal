"""Draw the favicon set and the Open Graph image in the site's colours.

Needs the JetBrains Mono release (see font.py). Run from the repo root:
  uv run --with-requirements tools/assets/requirements.txt tools/assets/icons.py <unzipped-release-dir>
"""
from pathlib import Path
import io
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"

PAGE = (6, 8, 7)
BG = (10, 13, 11)
BAR = (17, 22, 19)
LINE = (31, 39, 34)
FG = (214, 220, 212)
DIM = (139, 150, 141)
ACCENT = (79, 216, 138)
DOTS = [(255, 95, 87), (254, 188, 46), (40, 200, 64)]

NAME = "Akbarshokh Turobov"
TAGLINE = "Student, competitor and programmer"
PLACE = "from Gulistan, Uzbekistan."


def fonts(release):
    find = lambda w: str(next(release.rglob(f"JetBrainsMono-{w}.ttf")))
    return find("Regular"), find("Bold")


def save_png(img, path):
    clean = Image.new(img.mode, img.size)
    clean.paste(img)
    buf = io.BytesIO()
    clean.save(buf, "PNG", optimize=True)
    path.write_bytes(buf.getvalue())


def glyph_icon(size, bold, pad_ratio=0.0, radius_ratio=0.22):
    """Rounded dark square with a green '>_' prompt."""
    s = 4  # supersample
    big = Image.new("RGBA", (size * s, size * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    if radius_ratio:
        d.rounded_rectangle((0, 0, size * s - 1, size * s - 1), radius=int(size * s * radius_ratio), fill=BG + (255,))
    else:
        d.rectangle((0, 0, size * s, size * s), fill=BG + (255,))
    inner = size * s * (1 - 2 * pad_ratio)
    font = ImageFont.truetype(bold, int(inner * 0.5))
    text = ">_"
    box = d.textbbox((0, 0), text, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((size * s - w) / 2 - box[0], (size * s - h) / 2 - box[1] - inner * 0.02), text, font=font, fill=ACCENT + (255,))
    return big.resize((size, size), Image.LANCZOS)


def og_image(regular, bold):
    W, H, s = 1200, 630, 2
    img = Image.new("RGB", (W * s, H * s), PAGE)
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = 60 * s, 50 * s, (W - 60) * s, (H - 50) * s
    d.rounded_rectangle((x0, y0, x1, y1), radius=18 * s, fill=BG, outline=LINE, width=2 * s)
    d.rounded_rectangle((x0, y0, x1, y0 + 56 * s), radius=18 * s, fill=BAR)
    d.rectangle((x0, y0 + 30 * s, x1, y0 + 56 * s), fill=BAR)
    d.line((x0, y0 + 56 * s, x1, y0 + 56 * s), fill=LINE, width=2 * s)
    for i, c in enumerate(DOTS):
        cx, cy = x0 + (34 + i * 26) * s, y0 + 28 * s
        d.ellipse((cx - 8 * s, cy - 8 * s, cx + 8 * s, cy + 8 * s), fill=c)
    small = ImageFont.truetype(regular, 22 * s)
    title = "akbarshoh@portfolio: ~"
    tw = d.textlength(title, font=small)
    d.text(((W * s - tw) / 2, y0 + 15 * s), title, font=small, fill=DIM)

    body = ImageFont.truetype(regular, 30 * s)
    big = ImageFont.truetype(bold, 74 * s)
    tx, ty = x0 + 52 * s, y0 + 110 * s
    d.text((tx, ty), "guest@akbarshoh:~$ ", font=body, fill=ACCENT)
    pw = d.textlength("guest@akbarshoh:~$ ", font=body)
    d.text((tx + pw, ty), "whoami", font=body, fill=FG)
    d.text((tx, ty + 70 * s), NAME, font=big, fill=FG)
    d.text((tx, ty + 180 * s), TAGLINE, font=body, fill=DIM)
    d.text((tx, ty + 226 * s), PLACE, font=body, fill=DIM)
    py = ty + 310 * s
    d.text((tx, py), "guest@akbarshoh:~$ ", font=body, fill=ACCENT)
    cx = tx + pw
    d.rectangle((cx, py + 4 * s, cx + 17 * s, py + 38 * s), fill=ACCENT)
    return img.resize((W, H), Image.LANCZOS)


def main():
    regular, bold = fonts(Path(sys.argv[1]))
    for size, name in ((180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")):
        icon = glyph_icon(size, bold, radius_ratio=0 if name == "apple-touch-icon.png" else 0.22)
        save_png(icon.convert("RGB") if name == "apple-touch-icon.png" else icon, PUBLIC / name)
    save_png(glyph_icon(512, bold, pad_ratio=0.12, radius_ratio=0).convert("RGB"), PUBLIC / "icon-maskable-512.png")
    ico = [glyph_icon(n, bold, radius_ratio=0.18) for n in (16, 32, 48)]
    ico[2].save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:2])
    og = og_image(regular, bold)
    buf = io.BytesIO()
    og.save(buf, "PNG", optimize=True)
    (PUBLIC / "og.png").write_bytes(buf.getvalue())
    for p in ("apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "favicon.ico", "og.png"):
        print(p, (PUBLIC / p).stat().st_size, "bytes")


if __name__ == "__main__":
    main()
