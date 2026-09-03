#!/usr/bin/env python3
"""Add one story from a .docx to the listbyme library (docs/data/story-<id>.js).

Usage:
    python3 scripts/extract_docx.py path/to/story.docx --id ten-truyen [--title "Tên hiển thị"]

Requires: pip install python-docx

Each run adds/updates exactly one story file and registers a <script> tag
for it in docs/index.html (between the STORY_SCRIPTS markers), so the app
picks it up on the library screen without any other changes.
"""
import argparse
import json
import os
import re
import unicodedata

import docx


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "truyen"


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


def write_story_file(repo_root, story_id, data):
    out_path = os.path.join(repo_root, "docs", "data", "story-%s.js" % story_id)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("// Auto-generated — do not hand-edit; regenerate via scripts/extract_docx.py\n")
        f.write("window.STORY_LIBRARY = window.STORY_LIBRARY || [];\n")
        f.write("window.STORY_LIBRARY.push(")
        json.dump(data, f, ensure_ascii=False)
        f.write(");\n")
    return out_path


def register_script_tag(repo_root, story_id):
    index_path = os.path.join(repo_root, "docs", "index.html")
    with open(index_path, encoding="utf-8") as f:
        html = f.read()

    tag = '  <script src="data/story-%s.js"></script>' % story_id
    if tag in html:
        return index_path, False

    start_marker = "<!-- STORY_SCRIPTS_START -->"
    end_marker = "<!-- STORY_SCRIPTS_END -->"
    start = html.index(start_marker) + len(start_marker)
    end = html.index(end_marker)
    block = html[start:end]
    html = html[:start] + block + tag + "\n" + html[end:]

    with open(index_path, "w", encoding="utf-8") as f:
        f.write(html)
    return index_path, True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("docx_path")
    parser.add_argument("--id", help="Story id / slug (default: derived from the title)")
    parser.add_argument("--title", help="Override the display title (default: from the .docx)")
    args = parser.parse_args()

    data = extract(args.docx_path)
    if args.title:
        data["title"] = args.title

    story_id = args.id or slugify(data["title"])
    data["id"] = story_id

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = write_story_file(repo_root, story_id, data)
    index_path, inserted = register_script_tag(repo_root, story_id)

    print(f"Wrote {len(data['chapters'])} chapters to {out_path}")
    if inserted:
        print(f"Registered <script> tag for '{story_id}' in {index_path}")
    else:
        print(f"'{story_id}' was already registered in {index_path}")


if __name__ == "__main__":
    main()
