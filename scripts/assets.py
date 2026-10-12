"""Draw original vector-like icons; no AI images or external artwork."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "extension" / "icons"
ICON_DIR.mkdir(parents=True, exist_ok=True)

def icon(size):
    scale = 8
    image = Image.new("RGBA", (size * scale, size * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    unit = size * scale / 128
    coords = lambda values: tuple(round(x * unit) for x in values)
    draw.rounded_rectangle(coords((16, 16, 112, 112)), radius=round(22 * unit), fill="#FFA300")
    draw.arc(coords((38, 38, 90, 90)), start=40, end=322, fill="#1A1A1A", width=round(7 * unit))
    draw.polygon([coords(p) for p in [(79, 39), (94, 39), (94, 55)]], fill="#1A1A1A")
    draw.line([coords((64, 51)), coords((64, 65)), coords((73, 70))], fill="#1A1A1A", width=round(5 * unit), joint="curve")
    return image.resize((size, size), Image.Resampling.LANCZOS)

for size in (16, 32, 48, 128):
    icon(size).save(ICON_DIR / f"icon-{size}.png")
print("Generated original Tempo icons at 16, 32, 48, and 128 px.")
