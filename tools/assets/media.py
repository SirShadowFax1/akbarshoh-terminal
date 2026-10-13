"""Prepare photos for an entry in content.js.

For each input image this writes a full-size WebP (longest side at most
1600 px) and a 480 px wide thumbnail to public/assets/media/, with all
metadata (EXIF, GPS location, camera details) removed, then prints the
`media` block to paste into public/js/content.js.

Run from the repo root:
  uv run --with-requirements tools/assets/requirements.txt tools/assets/media.py <name> <photo> [<photo> ...]

<name> is a short lowercase name such as olympiad-2026. Files become
<name>-1.webp, <name>-1-thumb.webp, <name>-2.webp and so on.
"""
from pathlib import Path
import io
import json
import re
import sys

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "assets" / "media"
MAX_SIDE = 1600
THUMB_WIDTH = 480


def save_webp(img, path, quality):
    clean = Image.new("RGB", img.size)
    clean.paste(img)
    buf = io.BytesIO()
    clean.save(buf, "WEBP", quality=quality, method=6)
    path.write_bytes(buf.getvalue())


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    name = sys.argv[1]
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name):
        sys.exit("The name may only use lowercase letters, digits and dashes, for example olympiad-2026.")
    OUT.mkdir(parents=True, exist_ok=True)
    images = []
    for n, src in enumerate(sys.argv[2:], start=1):
        img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        thumb = img.resize((THUMB_WIDTH, round(img.height * THUMB_WIDTH / img.width)), Image.LANCZOS)
        full_path = OUT / f"{name}-{n}.webp"
        thumb_path = OUT / f"{name}-{n}-thumb.webp"
        save_webp(img, full_path, 82)
        save_webp(thumb, thumb_path, 78)
        images.append({
            "src": f"assets/media/{full_path.name}",
            "thumb": f"assets/media/{thumb_path.name}",
            "width": img.width,
            "height": img.height,
            "thumbWidth": thumb.width,
            "thumbHeight": thumb.height,
            "alt": "Describe what the photo shows",
        })
        print(f"wrote {full_path.name} ({img.width}x{img.height}) and {thumb_path.name}")
    block = json.dumps({"images": images}, indent=2)
    block = re.sub(r'"(\w+)":', r"\1:", block).replace('"', "'")
    print("\nPaste this into the entry in public/js/content.js, then write a real alt text for each photo:\n")
    print(f"media: {block},")


if __name__ == "__main__":
    main()
