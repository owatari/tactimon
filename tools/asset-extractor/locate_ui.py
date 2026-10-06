#!/usr/bin/env python3
"""Locate FireRed UI graphics inside the user's ROM and write an offset index.

The ROM has no symbol table, so graphics are located by *content*: the open
pret/pokefirered repository is used only as a lookup key (its indexed PNGs are
converted to GBA 4bpp/8bpp tile data, palettes to 15-bit colour, tilemaps are
used as-is) and the matching LZ77 block / raw bytes are searched in the local
ROM. Everything that is later extracted (tiles, tilemaps, palettes, fonts) is
read from the ROM itself; nothing from pret is copied into the game.

Usage:
  python tools/asset-extractor/locate_ui.py <cache_dir> [--rom local-assets/roms/firered.gba]

Writes tools/asset-extractor/ui-offsets.json: {"graphics/pokedex/bg.png": {"kind": "lz", "offset": N, "size": M}, ...}
"""
from __future__ import annotations

import argparse
import hashlib
import json
import struct
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
RAW = "https://raw.githubusercontent.com/pret/pokefirered/master/"
DIRS = [
    "pokedex", "fonts", "text_window", "interface", "item_menu", "party_menu",
    "summary_screen", "trainer_card", "battle_interface", "shop_menu",
    "region_map", "main_menu", "evolution_scene", "pokemon_storage",
    "misc", "learn_move", "title_screen", "oak_speech",
]


def decompress_lz77(data: bytes, offset: int) -> bytes | None:
    if offset + 4 > len(data) or data[offset] != 0x10:
        return None
    size = data[offset + 1] | (data[offset + 2] << 8) | (data[offset + 3] << 16)
    if not 8 <= size <= 0x100000:
        return None
    out = bytearray()
    pos = offset + 4
    try:
        while len(out) < size:
            flags = data[pos]
            pos += 1
            for bit in range(8):
                if len(out) >= size:
                    break
                if flags & (0x80 >> bit):
                    b1, b2 = data[pos], data[pos + 1]
                    pos += 2
                    length = (b1 >> 4) + 3
                    disp = (((b1 & 0xF) << 8) | b2) + 1
                    if disp > len(out):
                        return None
                    for _ in range(length):
                        out.append(out[-disp])
                else:
                    out.append(data[pos])
                    pos += 1
    except IndexError:
        return None
    return bytes(out[:size])


def png_to_tiles(path: Path, force_bpp: int | None = None) -> tuple[bytes, int] | None:
    """Indexed PNG -> GBA tile data (8x8 tiles, left-to-right then top-to-bottom). Returns (data, bpp)."""
    im = Image.open(path)
    if im.mode == "L":
        # gbagfx reads greyscale PNGs as 4bpp with the darkest shade = highest index.
        im = im.point(lambda v: 15 - (v >> 4)).convert("P")
    if im.mode != "P":
        return None
    w, h = im.size
    if w % 8 or h % 8:
        return None
    px = im.load()
    bpp = force_bpp or (4 if max(im.getdata()) < 16 else 8)
    out = bytearray()
    for ty in range(h // 8):
        for tx in range(w // 8):
            for y in range(8):
                row = [px[tx * 8 + x, ty * 8 + y] for x in range(8)]
                if bpp == 4:
                    for x in range(0, 8, 2):
                        out.append((row[x] & 0xF) | ((row[x + 1] & 0xF) << 4))
                else:
                    out.extend(row)
    return bytes(out), bpp


def font_bytes(path: Path) -> bytes:
    """pret gbagfx ConvertToFullWidth/HalfWidthLatinFont, reproduced to build the ROM lookup key."""
    im = Image.open(path)
    w, h = im.size
    px = im.load()
    buf = bytearray(w * h // 4)
    for y in range(h):
        for x in range(w):
            buf[y * (w // 4) + x // 4] |= (px[x, y] & 3) << (6 - 2 * (x % 4))
    full = path.name != "latin_small.png"
    cols, tiles = (16, 4) if full else (32, 2)
    out = bytearray()
    for row in range(h // 16):
        for col in range(cols):
            for gt in range(tiles):
                pxx = col * 16 + (gt & 1) * 8 if full else col * 8
                for i in range(8):
                    pyy = row * 16 + ((gt >> 1) if full else gt) * 8 + i
                    off = pyy * (w // 4) + pxx // 4
                    out += bytes([buf[off + 1], buf[off]])
    return bytes(out)


def pal_to_gba(text: str) -> bytes:
    lines = text.strip().splitlines()
    n = int(lines[2])
    out = bytearray()
    for line in lines[3:3 + n]:
        r, g, b = (int(v) for v in line.split())
        out += struct.pack("<H", (r >> 3) | ((g >> 3) << 5) | ((b >> 3) << 10))
    return bytes(out)


def fetch(url: str, dest: Path) -> bool:
    if dest.exists():
        return True
    try:
        data = urllib.request.urlopen(url, timeout=30).read()
    except Exception:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return True


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("cache")
    ap.add_argument("--rom", default=str(ROOT / "local-assets/roms/firered.gba"))
    args = ap.parse_args()
    cache = Path(args.cache)
    rom = Path(args.rom).read_bytes()

    tree = json.loads((cache / "tree.json").read_text(encoding="utf-8"))
    wanted = [
        t["path"] for t in tree["tree"]
        if t["type"] == "blob"
        and any(t["path"].startswith(f"graphics/{d}/") for d in DIRS)
        and t["path"].rsplit(".", 1)[-1] in ("png", "pal", "bin")
    ]
    print(f"{len(wanted)} reference files")
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(lambda p: fetch(RAW + p, cache / p), wanted))

    # Index every LZ77 stream in the ROM by content hash of the decompressed data.
    print("indexing ROM LZ77 streams ...")
    lz: dict[str, list[tuple[int, int]]] = {}
    for off in range(0, len(rom) - 4, 4):
        if rom[off] != 0x10:
            continue
        data = decompress_lz77(rom, off)
        if data:
            lz.setdefault(hashlib.sha1(data).hexdigest(), []).append((off, len(data)))
    print(len(lz), "distinct streams")

    # Streams by decompressed bytes, for prefix matches (ROM data trimmed vs the PNG's full tile sheet).
    streams = []
    for hlist in lz.values():
        off, size = hlist[0]
        d = decompress_lz77(rom, off)
        if d and len(d) >= 64 and any(d):
            streams.append((off, d))

    index: dict[str, dict] = {}
    for p in wanted:
        f = cache / p
        if not f.exists():
            continue
        ext = p.rsplit(".", 1)[-1]
        cands: list[tuple[str, bytes]] = []
        meta: dict = {}
        if ext == "png" and p.startswith("graphics/fonts/latin_"):
            data = font_bytes(f)
            pos = rom.find(data)
            if pos >= 0:
                index[p] = {"kind": "raw", "offset": pos, "size": len(data), "copies": 1, "font": True}
            continue
        if ext == "png":
            im0 = Image.open(f)
            meta = {"w": im0.size[0], "h": im0.size[1]}
            conv = png_to_tiles(f)
            if conv:
                cands.append(("lz", conv[0], 4 if conv[1] == 4 else 8))
                if conv[1] == 4:  # same pixels stored as 8bpp
                    cands.append(("lz", png_to_tiles(f, force_bpp=8)[0], 8))
                else:  # 8-bit PNG whose ROM data is 4bpp (low nibble; high nibble selects a palette bank)
                    cands.append(("lz", png_to_tiles(f, force_bpp=4)[0], 4))
        elif ext == "bin":
            cands.append(("lz", f.read_bytes()))
        elif ext == "pal":
            try:
                cands.append(("raw", pal_to_gba(f.read_text(encoding="latin-1"))))
            except Exception:
                continue
        for cand in cands:
            kind, data = cand[0], cand[1]
            if ext == "png" and len(cand) > 2:
                meta["bpp"] = cand[2]
            if not data:
                continue
            hit = lz.get(hashlib.sha1(data).hexdigest())
            if hit:
                index[p] = {"kind": "lz", "offset": hit[0][0], "size": len(data), "copies": len(hit), **meta}
                break
            pos = rom.find(data)
            if pos >= 0 and len(data) >= 16:
                index[p] = {"kind": "raw", "offset": pos, "size": len(data), "copies": 1, **meta}
                break
            if ext == "png" and len(data) >= 128:
                best = max(
                    ((o, d) for o, d in streams if len(d) < len(data) and len(d) >= len(data) // 2 and data.startswith(d)),
                    key=lambda t: len(t[1]),
                    default=None,
                )
                if best:
                    index[p] = {"kind": "lz", "offset": best[0], "size": len(best[1]), "copies": 1, "trimmed": True, **meta}
                    break

    # Palettes embedded in the PNGs (pret builds .gbapal from them): locate the raw 15-bit colours.
    for p in wanted:
        if not p.endswith(".png") or p.startswith("graphics/fonts/"):
            continue
        key = p[:-4] + ".pal"
        if key in index:
            continue
        f = cache / p
        if not f.exists():
            continue
        im = Image.open(f)
        pal = im.getpalette()
        if im.mode != "P" or not pal:
            continue
        n = min(len(pal) // 3, 16 if max(im.getdata()) < 16 else 256)
        data = b"".join(
            struct.pack("<H", (pal[i * 3] >> 3) | ((pal[i * 3 + 1] >> 3) << 5) | ((pal[i * 3 + 2] >> 3) << 10))
            for i in range(n)
        )
        pos = rom.find(data) if len(data) >= 16 else -1
        if pos >= 0:
            index[key] = {"kind": "raw", "offset": pos, "size": len(data), "copies": 1, "from_png": True}

    # Pokedex footprints (16x16 1bpp, 32 bytes each): pret PNG -> 1bpp key -> raw ROM lookup.
    species = json.loads((ROOT / "packages" / "game-data" / "data" / "kanto-species.json").read_text(encoding="utf-8"))
    dex_ids = {int(v["dex"]): k for k, v in species.items() if 1 <= int(v["dex"]) <= 151}
    fp_jobs = [(n, f"graphics/pokemon/{sid.replace('-', '_')}/footprint.png") for n, sid in sorted(dex_ids.items())]
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(lambda j: fetch(RAW + j[1], cache / j[1]), fp_jobs))
    for n, path in fp_jobs:
        f = cache / path
        if not f.exists():
            continue
        im = Image.open(f).convert("1")
        px = im.load()
        data = bytearray()
        for ty in range(2):
            for tx in range(2):
                for y in range(8):
                    b = 0
                    for x in range(8):
                        if px[tx * 8 + x, ty * 8 + y] == 0:
                            b |= 1 << x
                    data.append(b)
        pos = rom.find(bytes(data))
        if pos >= 0:
            index[f"footprint/{n:03d}"] = {"kind": "raw", "offset": pos, "size": 32, "copies": 1}

    # Party/Pokédex mon icons (32x64 4bpp = two 32x32 frames) and their shared palettes.
    icon_jobs = [(n, f"graphics/pokemon/{sid.replace('-', '_')}/icon.png") for n, sid in sorted(dex_ids.items())]
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(lambda j: fetch(RAW + j[1], cache / j[1]), icon_jobs))
    icon_palettes: list[bytes] = []
    for n, path in icon_jobs:
        f = cache / path
        if not f.exists():
            continue
        conv = png_to_tiles(f, force_bpp=4)
        im = Image.open(f)
        pal = im.getpalette()
        pal_bytes = b"".join(
            struct.pack("<H", (pal[i * 3] >> 3) | ((pal[i * 3 + 1] >> 3) << 5) | ((pal[i * 3 + 2] >> 3) << 10))
            for i in range(16)
        )
        pos = rom.find(conv[0]) if conv else -1
        if pos >= 0:
            if pal_bytes not in icon_palettes:
                icon_palettes.append(pal_bytes)
            index[f"icon/{n:03d}"] = {
                "kind": "raw", "offset": pos, "size": len(conv[0]), "copies": 1,
                "pal": icon_palettes.index(pal_bytes),
            }
    for k, pal_bytes in enumerate(icon_palettes):
        pos = rom.find(pal_bytes)
        if pos >= 0:
            index[f"iconpal/{k}"] = {"kind": "raw", "offset": pos, "size": 32, "copies": 1}

    # Area-marker sprite sheet (all marker shapes in one 0x4A0-byte stream; pret builds it from marker_N.png).
    marker_stream = decompress_lz77(rom, 4600892)
    if marker_stream and len(marker_stream) == 0x4A0:
        index["graphics/pokedex/area_markers/marker.png"] = {
            "kind": "lz", "offset": 4600892, "size": 0x4A0, "copies": 1, "bpp": 4, "w": 8, "h": 296,
        }

    # Glyph width tables: the C arrays act as lookup keys, bytes are then read from the ROM.
    import re
    text_c = (cache / "text.c")
    if not text_c.exists():
        fetch(RAW + "src/text.c", text_c)
    src = text_c.read_text(encoding="utf-8")
    for key, name in (("sFontNormalLatinGlyphWidths", "normal"), ("sFontSmallLatinGlyphWidths", "small")):
        m = re.search(key + r"\[\]\s*=\s*\{(.*?)\};", src, re.S)
        if m:
            widths = bytes(int(v) for v in re.findall(r"\d+", m.group(1)))
            pos = rom.find(widths)
            if pos >= 0:
                index[f"fontwidths/{name}"] = {"kind": "raw", "offset": pos, "size": len(widths), "copies": 1}

    out = Path(__file__).with_name("ui-offsets.json")
    out.write_text(json.dumps(index, indent=1, sort_keys=True), encoding="utf-8")
    print(f"located {len(index)}/{len(wanted)} -> {out}")


if __name__ == "__main__":
    sys.exit(main())
