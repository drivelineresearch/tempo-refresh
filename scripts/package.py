"""Produce a verified Web Store ZIP, source archive, and complete publisher kit."""
import hashlib
import json
import shutil
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXT = ROOT / "extension"
DIST = ROOT / "dist"
DIST.mkdir(exist_ok=True)
manifest = json.loads((EXT / "manifest.json").read_text())
version = manifest["version"]
assert manifest["manifest_version"] == 3
assert set(manifest["permissions"]) == {"alarms", "storage", "contextMenus", "activeTab"}
assert not manifest.get("host_permissions") and not manifest.get("content_scripts")

def archive(target, files):
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as output:
        for path, name in sorted(files, key=lambda entry: entry[1]):
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 11, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            output.writestr(info, path.read_bytes())
    with zipfile.ZipFile(target) as result:
        assert result.testzip() is None
    print(f"Verified {target.name}: {target.stat().st_size:,} bytes")

extension_zip = DIST / f"tempo-refresh-{version}.zip"
extension_files = [(p, str(p.relative_to(EXT))) for p in EXT.rglob("*") if p.is_file()]
extension_files.append((ROOT / "LICENSE", "LICENSE"))
archive(extension_zip, extension_files)
with zipfile.ZipFile(extension_zip) as package:
    assert "manifest.json" in package.namelist()
    assert json.loads(package.read("manifest.json")) == manifest
    for reference in [manifest["background"]["service_worker"], manifest["action"]["default_popup"], *manifest["icons"].values()]:
        assert reference in package.namelist(), reference

if (ROOT / "test-results/browser-report.json").exists():
    report = json.loads((ROOT / "test-results/browser-report.json").read_text())
    assert report.get("passed"), "Browser checks must pass before staging a release"
    shutil.copyfile(ROOT / "test-results/browser-report.json", ROOT / "docs/browser-report.json")

excluded = {".git", "node_modules", "dist", "test-results", "brain", ".venv"}
local_files = {"CLAUDE.local.md", "design/opus-result.json"}
try:
    inventory = subprocess.run(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=ROOT, check=True, capture_output=True).stdout.decode().split("\0")
    candidates = [ROOT / name for name in inventory if name]
except (OSError, subprocess.CalledProcessError):
    candidates = ROOT.rglob("*")
source_files = [(p, "tempo-refresh/" + str(p.relative_to(ROOT))) for p in candidates if p.is_file() and not any(part in excluded for part in p.relative_to(ROOT).parts) and str(p.relative_to(ROOT)) not in local_files and not p.name.endswith(".log") and not (p.name.startswith(".env") and p.name != ".env.example")]
archive(DIST / f"tempo-refresh-source-{version}.zip", source_files)
kit_files = [(extension_zip, extension_zip.name), (ROOT / "docs/PUBLISH.md", "PUBLISH.md"), (ROOT / "README.md", "INSTALL.md")]
kit_files += [(p, "store/" + str(p.relative_to(ROOT / "store"))) for p in (ROOT / "store").rglob("*") if p.is_file()]
archive(DIST / f"tempo-publisher-kit-{version}.zip", kit_files)
hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(DIST.glob("*.zip"))}
(DIST / "SHA256SUMS.txt").write_text("".join(f"{digest}  {name}\n" for name, digest in hashes.items()))
print(json.dumps(hashes, indent=2))
