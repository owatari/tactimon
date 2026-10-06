"""Builds apps/client/public/game-assets/ui/type-icons.png from the FireRed menu_info sheet.

The 18 type icons (32x12) live in the 128px-wide 4bpp sheet interface/menu_info.4bpp and use its
second palette bank. Output: one vertical strip, icon N (FireRed type id 0-17) at y = N * 12.
Run: python tools/asset-extractor/make_type_icons.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2] / "apps/client/public/game-assets"
sheet = (ROOT / "gba-ui/interface/menu_info.4bpp").read_bytes()
pal = (ROOT / "gba-ui/interface/menu_info.gbapal").read_bytes()[32:64]
# Tile offset (16 tiles per row) of each type icon, by FireRed type id (see lib/gba/dexRender.ts).
OFFSET = {0: 0x20, 1: 0x64, 2: 0x60, 3: 0x80, 4: 0x48, 5: 0x44, 6: 0x6C, 7: 0x68, 8: 0x88, 9: 0xA4,
          10: 0x24, 11: 0x28, 12: 0x2C, 13: 0x40, 14: 0x84, 15: 0x4C, 16: 0xA0, 17: 0x8C}
colors = []
for i in range(16):
    v = pal[i * 2] | (pal[i * 2 + 1] << 8)
    colors.append(((v & 31) * 255 // 31, ((v >> 5) & 31) * 255 // 31, ((v >> 10) & 31) * 255 // 31, 0 if i == 0 else 255))

def pixel(tile: int, x: int, y: int) -> int:
    b = sheet[tile * 32 + y * 4 + x // 2]
    return (b >> 4) if x & 1 else (b & 15)

out = Image.new("RGBA", (32, 12 * 18))
for t, off in OFFSET.items():
    for y in range(12):
        for x in range(32):
            tile = off + (y // 8) * 16 + x // 8
            out.putpixel((x, t * 12 + y), colors[pixel(tile, x % 8, y % 8)])
out.save(ROOT / "ui/type-icons.png")
print("ok", out.size)
