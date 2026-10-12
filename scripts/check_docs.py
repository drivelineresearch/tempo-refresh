"""Check local documentation links, release metadata, and committed graphics."""
import json
import re
import struct
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {".git", "node_modules", "dist", "test-results", "brain", ".venv"}
errors = []
links = 0

def check_target(document, target):
    global links
    target = target.strip().split(' "', 1)[0].strip("<>")
    parsed = urlsplit(target)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return
    links += 1
    resolved = (document.parent / unquote(parsed.path)).resolve()
    if not resolved.is_relative_to(ROOT) or not resolved.exists():
        errors.append(f"{document.relative_to(ROOT)}: missing local link {target}")

class HTMLLinks(HTMLParser):
    def __init__(self, document):
        super().__init__()
        self.document = document

    def handle_starttag(self, tag, attributes):
        for name, value in attributes:
            if not value:
                continue
            if name in {"src", "href"}:
                check_target(self.document, value)
            if name == "srcset":
                for candidate in value.split(","):
                    check_target(self.document, candidate.strip().split()[0])

documents = [p for p in ROOT.rglob("*.md") if not any(part in EXCLUDED for part in p.relative_to(ROOT).parts)]
for document in documents:
    source = re.sub(r"```[^\n]*\n.*?```", "", document.read_text(), flags=re.S)
    for match in re.finditer(r"!?\[[^\]]*\]\(([^\n()]+)\)", source):
        check_target(document, match.group(1))
    HTMLLinks(document).feed(source)

for name in ("CLAUDE.md", "AGENTS.md"):
    source = (ROOT / name).read_text()
    if len(source.splitlines()) >= 200:
        errors.append(f"{name}: instruction guide exceeds the 200-line budget")
    if re.search(r"(?m)^\s*@", source):
        errors.append(f"{name}: eager imports are not part of this guide")

manifest = json.loads((ROOT / "extension/manifest.json").read_text())
package = json.loads((ROOT / "package.json").read_text())
if manifest["version"] != package["version"] or package.get("license") != "MIT":
    errors.append("Package/manifest version or MIT metadata mismatch")

images = {
    "docs/assets/hero-light.png": (1280, 680),
    "docs/assets/hero-dark.png": (1280, 680),
    "docs/assets/tempo-social-1200x630.png": (1200, 630),
    "store/icon-128.png": (128, 128),
    "store/promo-440x280.png": (440, 280),
    "store/screenshot-light-1280x800.png": (1280, 800),
    "store/screenshot-dark-1280x800.png": (1280, 800),
}
for name, size in images.items():
    image = ROOT / name
    if not image.exists():
        errors.append(f"Missing graphic: {name}")
        continue
    data = image.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n" or struct.unpack(">II", data[16:24]) != size:
        errors.append(f"Incorrect PNG dimensions: {name}")

if errors:
    raise SystemExit("\n".join(errors))
print(f"Checked {len(documents)} documents, {links} local references, agent budgets, metadata, and {len(images)} graphic sizes.")
