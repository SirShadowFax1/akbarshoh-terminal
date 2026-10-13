"""Make the public CV: no phone number, current LinkedIn URL, no metadata.

The original in assets/originals/ is opened read-only and never written.
The contact line (phone | email) and the LinkedIn line are removed with real
redactions (the text is deleted from the content stream, not covered), then
the email and LinkedIn URL are written back centred on the same baselines in
Times-Roman (the PDF base font metrically identical to the original Times New
Roman, and it keeps "-" extracting as a plain hyphen), with clickable links.

Run from the repo root:
  uv run --with-requirements tools/assets/requirements.txt tools/assets/cv.py
"""
from pathlib import Path
import re

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "originals" / "CV.pdf"
OUT = ROOT / "public" / "docs" / "Akbarshokh_Turobov_CV.pdf"

EMAIL = "akbarshoh542@gmail.com"
LINKEDIN_TEXT = "www.linkedin.com/in/akbarshoh-turobovat"
LINKEDIN_URL = "https://www.linkedin.com/in/akbarshoh-turobovat"
PHONE = re.compile(r"\+?\d[\d\s()-]{7,}\d")


def find_line(page, predicate):
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            text = "".join(s["text"] for s in line["spans"])
            if predicate(text):
                span = line["spans"][0]
                return pymupdf.Rect(line["bbox"]), span["origin"][1], span["size"]
    raise SystemExit("expected line not found in CV")


def main():
    doc = pymupdf.open(SRC)
    page = doc[0]

    contact_rect, contact_y, size = find_line(page, lambda t: EMAIL in t and PHONE.search(t))
    linkedin_rect, linkedin_y, _ = find_line(page, lambda t: "linkedin.com/in/" in t)
    centre = (contact_rect.x0 + contact_rect.x1) / 2

    for rect in (contact_rect, linkedin_rect):
        # Shrink vertically so neighbouring lines are never touched.
        page.add_redact_annot(pymupdf.Rect(page.rect.x0, rect.y0 + 0.6, page.rect.x1, rect.y1 - 0.6))
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=pymupdf.PDF_REDACT_LINE_ART_NONE)
    for link in page.get_links():
        page.delete_link(link)

    for text, baseline, uri in (
        (EMAIL, contact_y, f"mailto:{EMAIL}"),
        (LINKEDIN_TEXT, linkedin_y, LINKEDIN_URL),
    ):
        width = pymupdf.get_text_length(text, fontname="tiro", fontsize=size)
        x = centre - width / 2
        page.insert_text((x, baseline), text, fontname="tiro", fontsize=size, color=(0, 0, 0))
        hit = pymupdf.Rect(x, baseline - size * 0.9, x + width, baseline + size * 0.25)
        page.insert_link({"kind": pymupdf.LINK_URI, "from": hit, "uri": uri})

    # Page 3 of the original is blank.
    keep = [i for i in range(doc.page_count) if doc[i].get_text().strip()]
    doc.select(keep)

    doc.scrub(
        attached_files=True,
        clean_pages=True,
        embedded_files=True,
        hidden_text=True,
        javascript=True,
        metadata=True,
        redactions=False,
        remove_links=False,
        reset_fields=True,
        reset_responses=True,
        thumbnails=True,
        xml_metadata=True,
    )
    doc.subset_fonts()
    doc.set_metadata({"title": "Akbarshokh Turobov - CV", "author": "Akbarshokh Turobov"})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT, garbage=4, deflate=True, clean=True, no_new_id=True)
    doc.close()

    check = pymupdf.open(OUT)
    text = "".join(p.get_text() for p in check)
    if PHONE.search(text) or "+998" in text:
        raise SystemExit("phone number still present in public CV")
    if EMAIL not in text or LINKEDIN_TEXT not in text:
        raise SystemExit("email or LinkedIn missing from public CV")
    print(f"{OUT.name}: {check.page_count} pages, {OUT.stat().st_size // 1024} KB, metadata {check.metadata}")
    print("links:", [l["uri"] for p in check for l in p.get_links()])


if __name__ == "__main__":
    main()
