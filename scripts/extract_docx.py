#!/usr/bin/env python3
"""Extract chapters from a .docx novel into app/data/story-data.js.

Usage: python3 scripts/extract_docx.py path/to/story.docx
Requires: pip install python-docx
"""
import json
import os
import sys

import docx


def extract(docx_path):
    d = docx.Document(docx_path)
    paras = d.paragraphs

    title = paras[0].text.strip() if paras else "Truyện"
    subtitle = paras[1].text.strip() if len(paras) > 1 else ""

    chapters = []
    current = None
    for p in paras:
        style = p.style.name if p.style else ""
        text = p.text.strip()
        if style and style.startswith("Heading"):
            if current:
                chapters.append(current)
            current = {"title": text, "paragraphs": []}
        elif current is not None and text:
            current["paragraphs"].append(text)
    if current:
        chapters.append(current)

    for i, ch in enumerate(chapters):
        ch["id"] = i
        ch["wordCount"] = len(" ".join(ch["paragraphs"]).split())

    return {"title": title, "subtitle": subtitle, "chapters": chapters}


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/extract_docx.py path/to/story.docx")
        sys.exit(1)

    docx_path = sys.argv[1]
    data = extract(docx_path)

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = os.path.join(repo_root, "app", "data", "story-data.js")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(
            "// Auto-generated from a .docx source — regenerate via scripts/extract_docx.py\n"
        )
        f.write("window.STORY_DATA = ")
        json.dump(data, f, ensure_ascii=False)
        f.write(";\n")

    print(f"Wrote {len(data['chapters'])} chapters to {out_path}")


if __name__ == "__main__":
    main()
