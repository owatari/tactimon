"""Shared helpers for reading the local FireRed ROM and extracted map data."""
import json
import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROM = (ROOT / "local-assets" / "roms" / "firered.gba").read_bytes()
A = ROOT / "local-assets" / "extracted" / "firered" / "assets"
WORLD = A / "maps" / "world"
DATA = ROOT / "packages" / "game-data" / "data"

SPECIES = json.loads((DATA / "kanto-species.json").read_text(encoding="utf-8"))
DEX = [None] * 152
for sid, s in SPECIES.items():
    DEX[s["dex"]] = sid


def ptr(value):
    return value - 0x08000000 if 0x08000000 <= value < 0x0A000000 else None


def decode_text(offset, limit=800):
    out = ""
    i = offset
    while i < offset + limit:
        c = ROM[i]
        if c == 0xFF:
            break
        if 0xBB <= c <= 0xD4:
            out += chr(65 + c - 0xBB)
        elif 0xD5 <= c <= 0xEE:
            out += chr(97 + c - 0xD5)
        elif 0xA1 <= c <= 0xAA:
            out += str(c - 0xA1)
        elif c == 0xFE:
            out += "\n"
        elif c == 0xFA:
            out += "\n"
        elif c == 0xFB:
            out += "\f"  # page break
        elif c == 0xFD:
            i += 1
            out += {1: "{PLAYER}", 6: "{RIVAL}"}.get(ROM[i], "{?}")
        elif c == 0xFC:
            i += 1
            n = {0x01: 1, 0x02: 1, 0x03: 1, 0x04: 3, 0x05: 2, 0x06: 1, 0x07: 0, 0x08: 1, 0x09: 0, 0x0A: 0, 0x0B: 2, 0x0C: 1, 0x0D: 1, 0x0E: 1, 0x0F: 0, 0x10: 2, 0x11: 0, 0x12: 1, 0x13: 1, 0x14: 1, 0x15: 0, 0x16: 0, 0x17: 0, 0x18: 1}.get(ROM[i], 0)
            i += n
        else:
            out += {0: " ", 0xAB: "!", 0xAC: "?", 0xAD: ".", 0xAE: "-", 0xB0: "…", 0xB1: "“", 0xB2: "”", 0xB3: "‘", 0xB4: "'", 0xB8: ",", 0xBA: "/", 0xF0: ":", 0x1B: "é", 0x54: "Poké"}.get(c, "?")
        i += 1
    return out


def load_names(table_base_search="MASTER BALL"):
    enc = bytes([0xBB + ord(c) - 65 if c.isalpha() else 0 for c in table_base_search]) + b"\xff"
    pos = ROM.find(enc)
    base = pos - 44
    names = {}
    prices = {}
    for k in range(0, 375):
        o = base + k * 44
        raw = ROM[o:o + 14]
        text = ""
        for c in raw:
            if c == 0xFF:
                break
            if 0xBB <= c <= 0xD4:
                text += chr(65 + c - 0xBB)
            elif 0xD5 <= c <= 0xEE:
                text += chr(97 + c - 0xD5)
            elif c == 0:
                text += " "
            elif 0xA1 <= c <= 0xAA:
                text += str(c - 0xA1)
            elif c == 0xAE:
                text += "-"
            elif c == 0xAD:
                text += "."
            elif c == 0x1B:
                text += "é"
            else:
                text += "?"
        names[k] = text
        prices[k] = struct.unpack("<H", ROM[o + 16:o + 18])[0]
    return names, prices


ITEM_NAMES, ITEM_PRICES = load_names()
