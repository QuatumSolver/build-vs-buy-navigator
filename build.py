"""Build index.html from src/page.html, src/compare.css, src/compare.js and data/*.json.

Run: python3 build.py
Edit the data in data/compare.json and data/glossary.json, or the page in src/, then rebuild.
"""
import json, pathlib
root = pathlib.Path(__file__).parent
page = (root / "src/page.html").read_text()
def js(path):
    data = json.loads((root / path).read_text())
    return json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
out = (page
       .replace("__EXTRA_CSS__", (root / "src/compare.css").read_text())
       .replace("__EXTRA_JS__", (root / "src/compare.js").read_text())
       .replace("__COMPARE_JSON__", js("data/compare.json"))
       .replace("__GLOSSARY_JSON__", js("data/glossary.json")))
assert "__" not in "".join(x for x in ["__EXTRA_CSS__","__EXTRA_JS__","__COMPARE_JSON__","__GLOSSARY_JSON__"] if x in out)
(root / "index.html").write_text(out)
print(f"index.html written, {len(out)//1024} KB")
