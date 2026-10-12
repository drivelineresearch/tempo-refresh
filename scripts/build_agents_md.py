"""Build plain-Markdown AGENTS.md from the canonical CLAUDE.md."""
import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HEADER = "<!-- Generated from CLAUDE.md by scripts/build_agents_md.py. Edit the source. -->\n\n"

def build(source):
    text = re.sub(r'<important if="([^"]+)">\n', lambda match: f"### When {match[1]}\n\n", source)
    text = re.sub(r"\n</important>", "", text)
    if "<important" in text or "</important>" in text:
        raise ValueError("Unsupported conditional block in CLAUDE.md")
    return HEADER + text

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--check", action="store_true", help="Fail if AGENTS.md differs from the source")
args = parser.parse_args()
expected = build((ROOT / "CLAUDE.md").read_text())
target = ROOT / "AGENTS.md"
if args.check:
    if not target.exists() or target.read_text() != expected:
        raise SystemExit("AGENTS.md differs; run python3 scripts/build_agents_md.py")
    print("Agent instructions match their canonical source.")
else:
    target.write_text(expected)
    print("Generated AGENTS.md.")
