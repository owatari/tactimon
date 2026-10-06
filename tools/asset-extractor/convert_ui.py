#!/usr/bin/env python3
"""Export FireRed UI graphics (tiles, tilemaps, palettes, fonts) straight from the ROM.

Reads tools/asset-extractor/ui-offsets.json (produced by locate_ui.py) and writes
local-assets/extracted/firered/assets/gba-ui/ (git-ignored, synced to public/game-assets/gba-ui):

  gba-ui/index.json                  name -> {file, kind, bpp?, w?, h?}
  gba-ui/<dir>/<name>.4bpp|.8bpp     decompressed tile data (raw GBA tiles)
  gba-ui/<dir>/<name>.bin            tilemaps
  gba-ui/<dir>/<name>.gbapal         palettes (little-endian BGR555)
  gba-ui/cries/NNN.wav               Pokemon cries 001-151 (decoded m4a compressed waves, 8-bit mono)
  gba-ui/fonts/normal.bin|small.bin  glyph bitmaps, 1 byte per pixel (0..3), 512 glyphs (256 + extra symbols)
  gba-ui/fonts/normal.json|small.json  {"glyphW", "glyphH", "widths": [...]}

Usage: python tools/asset-extractor/convert_ui.py [--rom local-assets/roms/firered.gba]
"""
from __future__ import annotations

import argparse
import json
import struct
import sys
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from locate_ui import decompress_lz77  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "local-assets" / "extracted" / "firered" / "assets" / "gba-ui"


def decode_font(raw: bytes, full: bool) -> bytes:
    """ROM .fwlatfont/.hwlatfont -> 512 glyphs, 1 byte per pixel.

    Each tile row is a little-endian u16; pixel x is bits (14 - 2x) .. (15 - 2x).
    Full-width glyphs are 16x16 (4 tiles: TL TR BL BR), half-width 8x16 (2 tiles: top bottom)."""
    gw = 16 if full else 8
    tiles = 4 if full else 2
    out = bytearray(512 * gw * 16)
    for g in range(512):
        for t in range(tiles):
            ox = (t & 1) * 8 if full else 0
            oy = (t >> 1) * 8 if full else t * 8
            base = (g * tiles + t) * 16
            for i in range(8):
                word = raw[base + i * 2] | (raw[base + i * 2 + 1] << 8)
                for x in range(8):
                    out[g * gw * 16 + (oy + i) * gw + ox + x] = (word >> (14 - 2 * x)) & 3
    return bytes(out)


CRY_DELTAS = [0, 1, 4, 9, 16, 25, 36, 49, -64, -49, -36, -25, -16, -9, -4, -1]


def find_cry_table(rom: bytes) -> int:
    """gCryTable: a run of 12-byte ToneData entries `20 3C 00 00 <wave ptr> FF 00 FF 00` (one per species)."""
    hits = []
    for off in range(0, len(rom) - 12, 4):
        if (
            rom[off] == 0x20 and rom[off + 1] == 0x3C and rom[off + 2] == 0 and rom[off + 3] == 0
            and rom[off + 8] == 0xFF and rom[off + 9] == 0
            and 0x08000000 <= struct.unpack("<I", rom[off + 4:off + 8])[0] < 0x0A000000
        ):
            hits.append(off)
    best_start, best_len = 0, 0
    run_start, run_len = None, 0
    for i, off in enumerate(hits):
        if run_start is not None and off == hits[i - 1] + 12:
            run_len += 1
        else:
            run_start, run_len = off, 1
        if run_len > best_len:
            best_start, best_len = run_start, run_len
    if best_len < 380:
        raise SystemExit("gCryTable not found")
    return best_start


def decode_cry(rom: bytes, entry: int) -> tuple[bytes, int]:
    """Decode one compressed (type 1) m4a wave: blocks of 33 bytes = start value + 32 bytes of 4-bit
    delta indices (high nibble first) -> 64 signed 8-bit samples. Returns (unsigned 8-bit PCM, sample rate)."""
    ptr = struct.unpack("<I", rom[entry + 4:entry + 8])[0] - 0x08000000
    wave_type, _status, freq, _loop, size = struct.unpack("<HHIII", rom[ptr:ptr + 16])
    if wave_type != 1:
        raise ValueError("unexpected cry wave type")
    out = bytearray()
    pos = ptr + 16
    while len(out) < size:
        pcm = rom[pos]
        pos += 1
        pcm = pcm - 256 if pcm > 127 else pcm
        for j in range(32):
            b = rom[pos + j]
            for nib in (b >> 4, b & 15):
                pcm = ((pcm + CRY_DELTAS[nib] + 128) & 255) - 128
                out.append((pcm + 128) & 255)
        pos += 32
    return bytes(out[:size]), freq // 1024


def export_cries(rom: bytes, index: dict) -> int:
    table = find_cry_table(rom)
    dest = OUT / "cries"
    dest.mkdir(parents=True, exist_ok=True)
    for dex in range(1, 152):
        pcm, rate = decode_cry(rom, table + 12 * (dex - 1))
        with wave.open(str(dest / f"{dex:03d}.wav"), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(1)
            w.setframerate(rate)
            w.writeframes(pcm)
        index[f"cries/{dex:03d}"] = {"file": f"cries/{dex:03d}.wav", "kind": "cry"}
    return 151


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rom", default=str(ROOT / "local-assets/roms/firered.gba"))
    args = ap.parse_args()
    rom = Path(args.rom).read_bytes()
    offsets = json.loads((Path(__file__).with_name("ui-offsets.json")).read_text(encoding="utf-8"))

    OUT.mkdir(parents=True, exist_ok=True)
    index: dict[str, dict] = {}
    for key, e in sorted(offsets.items()):
        if key.startswith("fontwidths/") or e.get("font"):
            continue
        if key.startswith("icon/"):
            n = key.split("/")[1]
            dest = OUT / "pokedex" / "icons" / f"{n}.4bpp"
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(rom[e["offset"]:e["offset"] + e["size"]])
            index[f"pokedex/icons/{n}"] = {"file": f"pokedex/icons/{n}.4bpp", "kind": "icon", "pal": e["pal"]}
            continue
        if key.startswith("iconpal/"):
            k = key.split("/")[1]
            dest = OUT / "pokedex" / "icons" / f"pal{k}.gbapal"
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(rom[e["offset"]:e["offset"] + 32])
            index[f"pokedex/icons/pal{k}"] = {"file": f"pokedex/icons/pal{k}.gbapal", "kind": "palette"}
            continue
        if key.startswith("footprint/"):
            dest = OUT / "pokedex" / "footprints" / f"{key.split('/')[1]}.bin"
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(rom[e["offset"]:e["offset"] + 32])
            index[f"pokedex/footprints/{key.split('/')[1]}"] = {"file": f"pokedex/footprints/{key.split('/')[1]}.bin", "kind": "footprint"}
            continue
        data = decompress_lz77(rom, e["offset"]) if e["kind"] == "lz" else rom[e["offset"]:e["offset"] + e["size"]]
        if data is None:
            continue
        rel = key.removeprefix("graphics/")
        stem, ext = rel.rsplit(".", 1)
        if ext == "png":
            bpp = e.get("bpp", 4)
            out_rel = f"{stem}.{bpp}bpp"
            entry = {"file": out_rel, "kind": "tiles", "bpp": bpp, "w": e.get("w"), "h": e.get("h")}
        elif ext == "pal":
            out_rel = f"{stem}.gbapal"
            entry = {"file": out_rel, "kind": "palette"}
        else:
            out_rel = rel
            entry = {"file": out_rel, "kind": "tilemap"}
        dest = OUT / out_rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        index[rel] = entry

    for name, key, full in (
        ("normal", "graphics/fonts/latin_normal.png", True),
        ("small", "graphics/fonts/latin_small.png", False),
    ):
        e = offsets[key]
        glyphs = decode_font(rom[e["offset"]:e["offset"] + e["size"]], full)
        w = offsets[f"fontwidths/{name}"]
        widths = list(rom[w["offset"]:w["offset"] + 512])
        (OUT / "fonts").mkdir(exist_ok=True)
        (OUT / "fonts" / f"{name}.bin").write_bytes(glyphs)
        (OUT / "fonts" / f"{name}.json").write_text(
            json.dumps({"glyphW": 16 if full else 8, "glyphH": 16, "widths": widths}), encoding="utf-8"
        )
        index[f"fonts/{name}"] = {"kind": "font", "file": f"fonts/{name}.bin", "meta": f"fonts/{name}.json"}

    export_cries(rom, index)

    (OUT / "index.json").write_text(json.dumps(index, indent=1, sort_keys=True), encoding="utf-8")
    total = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
    print(f"exported {len(index)} UI assets ({total // 1024} KiB) -> {OUT}")


if __name__ == "__main__":
    main()
