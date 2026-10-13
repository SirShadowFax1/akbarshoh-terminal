"""Render the IELTS and SAT reports to redacted, metadata-free WebP images.

Sensitive fields are covered with solid opaque black rectangles drawn into
the pixels before encoding, so nothing underneath survives in the output.

Run from the repo root:
  uv run --with-requirements tools/assets/requirements.txt tools/assets/certs.py
"""
from pathlib import Path
import io

import pymupdf
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ORIG = ROOT / "assets" / "originals"
OUT = ROOT / "public" / "assets" / "certs"
THUMB_WIDTH = 480
BLACK = (0, 0, 0)

# IELTS: a scanned page with no text layer. The page is 1455.8 x 2055.4 pt and
# the embedded scan is 1454 x 2054 px, so zoom 1 renders it at native
# resolution (about 176 DPI of the physical A4 sheet). Rects are in page points.
IELTS_REDACT = {
    "candidate number": (1183, 338, 1388, 410),
    "candidate photo": (1076, 446, 1386, 741),
    "candidate id": (275, 662, 718, 741),
    "date of birth": (275, 776, 570, 849),
    "administrator signature": (935, 1543, 1205, 1668),
    "test report form number": (1031, 1659, 1381, 1741),
}

SAT_DPI = 200
SAT_KEEP_HEIGHT_PT = 510  # everything below the score panels is blank page


def render(page, zoom):
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def scale_rect(rect, zoom, pad=0, pad_y=None):
    x0, y0, x1, y1 = rect
    pad_y = pad if pad_y is None else pad_y
    return (
        int(x0 * zoom) - pad,
        int(y0 * zoom) - pad_y,
        int(x1 * zoom + 0.999) + pad,
        int(y1 * zoom + 0.999) + pad_y,
    )


def sat_redactions(page):
    """Find the record locator value and the QR code without hardcoding values."""
    rects = {}
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            spans = line["spans"]
            text = "".join(s["text"] for s in spans)
            if "Record Locator" not in text:
                continue
            label_end = None
            value = None
            for span in spans:
                if "Record Locator" in span["text"]:
                    label_end = span["bbox"][2]
                    rest = span["text"].split(":", 1)[1].strip() if ":" in span["text"] else ""
                    if rest:
                        # Value shares a span with the label: cover from the colon onward.
                        colon = page.search_for("Record Locator:", clip=pymupdf.Rect(span["bbox"]))[0]
                        value = pymupdf.Rect(colon.x1, span["bbox"][1], span["bbox"][2], span["bbox"][3])
                elif label_end is not None and span["text"].strip():
                    r = pymupdf.Rect(span["bbox"])
                    value = r if value is None else value | r
            if value is not None:
                rects["record locator"] = tuple(value)
    qr = [
        info["bbox"]
        for info in page.get_image_info()
        if abs((info["bbox"][2] - info["bbox"][0]) - (info["bbox"][3] - info["bbox"][1])) < 2
        and (info["bbox"][2] - info["bbox"][0]) > 30
    ]
    if len(qr) != 1:
        raise SystemExit(f"expected exactly one square QR image on the SAT page, found {len(qr)}")
    rects["qr code"] = tuple(qr[0])
    if "record locator" not in rects:
        raise SystemExit("record locator not found on the SAT page")
    return rects


def redact(img, rects):
    draw = ImageDraw.Draw(img)
    for box in rects.values():
        draw.rectangle(box, fill=BLACK)
    return img


def save_webp(img, path, quality):
    # A fresh RGB image carries no EXIF, XMP or ICC data into the encoder.
    clean = Image.new("RGB", img.size)
    clean.paste(img)
    buf = io.BytesIO()
    clean.save(buf, "WEBP", quality=quality, method=6)
    path.write_bytes(buf.getvalue())
    return clean.size


def verify_black(path, rects):
    img = Image.open(path).convert("RGB")
    for name, (x0, y0, x1, y1) in rects.items():
        inner = img.crop((x0 + 3, y0 + 3, x1 - 3, y1 - 3))
        hi = max(channel[1] for channel in inner.getextrema())
        if hi > 12:
            raise SystemExit(f"{path.name}: redaction '{name}' is not solid black (max {hi})")


def build(name, img, rects, quality):
    redact(img, rects)
    full = OUT / f"{name}.webp"
    thumb = OUT / f"{name}-thumb.webp"
    size = save_webp(img, full, quality)
    verify_black(full, rects)
    t = img.resize((THUMB_WIDTH, round(img.height * THUMB_WIDTH / img.width)), Image.LANCZOS)
    tsize = save_webp(t, thumb, 78)
    print(f"{name}: {size[0]}x{size[1]} {full.stat().st_size // 1024} KB, thumb {tsize[0]}x{tsize[1]} {thumb.stat().st_size // 1024} KB")
    return rects


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    ielts = pymupdf.open(ORIG / "IELTS8.pdf")
    img = render(ielts[0], 1)
    rects = {k: scale_rect(v, 1) for k, v in IELTS_REDACT.items()}
    build("ielts", img, rects, 80)

    sat = pymupdf.open(ORIG / "1490.pdf")
    page = sat[0]
    zoom = SAT_DPI / 72
    img = render(page, zoom)
    img = img.crop((0, 0, img.width, int(SAT_KEEP_HEIGHT_PT * zoom)))
    rects = {k: scale_rect(v, zoom, pad=6, pad_y=2) for k, v in sat_redactions(page).items()}
    build("sat", img, rects, 82)


if __name__ == "__main__":
    main()
