#!/usr/bin/env python3
"""Extract Kanto (1-151) species, level-up learnsets, evolutions and Gen-3
move data from a local FireRed (rev 0) ROM into packages/game-data/data/.

Usage: python tools/rom-data/extract-kanto-data.py local-assets/roms/firered.gba

The ROM never leaves the machine; only the generated JSON is versioned.
Table offsets are located by signature, not hard-coded, and sanity-checked.
"""
import json
import struct
import sys
from pathlib import Path

TYPES = ["normal", "fighting", "flying", "poison", "ground", "rock", "bug", "ghost", "steel", "???", "fire", "water", "grass", "electric", "psychic", "ice", "dragon", "dark"]
GROWTH = ["medium-fast", "erratic", "fluctuating", "medium-slow", "fast", "slow"]
EVO_METHODS = {1: "friendship", 2: "friendship-day", 3: "friendship-night", 4: "level", 5: "trade", 6: "trade-item", 7: "item", 8: "level-atk-gt-def", 9: "level-atk-eq-def", 10: "level-atk-lt-def", 11: "level-silcoon", 12: "level-cascoon", 13: "level-ninjask", 14: "level-shedinja", 15: "beauty"}

DEX = (
    "bulbasaur ivysaur venusaur charmander charmeleon charizard squirtle wartortle blastoise caterpie metapod butterfree weedle kakuna beedrill pidgey pidgeotto pidgeot rattata raticate spearow fearow ekans arbok pikachu raichu sandshrew sandslash nidoran-f nidorina nidoqueen nidoran-m nidorino nidoking clefairy clefable vulpix ninetales jigglypuff wigglytuff zubat golbat oddish gloom vileplume paras parasect venonat venomoth diglett dugtrio meowth persian psyduck golduck mankey primeape growlithe arcanine poliwag poliwhirl poliwrath abra kadabra alakazam machop machoke machamp bellsprout weepinbell victreebel tentacool tentacruel geodude graveler golem ponyta rapidash slowpoke slowbro magnemite magneton farfetchd doduo dodrio seel dewgong grimer muk shellder cloyster gastly haunter gengar onix drowzee hypno krabby kingler voltorb electrode exeggcute exeggutor cubone marowak hitmonlee hitmonchan lickitung koffing weezing rhyhorn rhydon chansey tangela kangaskhan horsea seadra goldeen seaking staryu starmie mr-mime scyther jynx electabuzz magmar pinsir tauros magikarp gyarados lapras ditto eevee vaporeon jolteon flareon porygon omanyte omastar kabuto kabutops aerodactyl snorlax articuno zapdos moltres dratini dragonair dragonite mewtwo mew"
).split()

rom = Path(sys.argv[1]).read_bytes()


def decode(offset, length):
    out = ""
    for c in rom[offset:offset + length]:
        if c == 0xFF:
            break
        if 0xBB <= c <= 0xD4:
            out += chr(65 + c - 0xBB)
        elif 0xD5 <= c <= 0xEE:
            out += chr(97 + c - 0xD5)
        elif 0xA1 <= c <= 0xAA:
            out += str(c - 0xA1)
        elif c == 0x00:
            out += " "
        elif c == 0xAE:
            out += "-"
        elif c == 0xB4:
            out += "'"
        elif c == 0xAD:
            out += "."
        else:
            out += "?"
    return out


def find_unique(pattern, what):
    first = rom.find(pattern)
    if first < 0:
        sys.exit(f"signature not found: {what}")
    return first


# --- base stats (28 bytes/species; Bulbasaur = species 1) -------------------
bulb = find_unique(bytes([45, 49, 49, 45, 65, 65, 12, 3, 45]), "Bulbasaur base stats")
base_stats = bulb - 28


def species_stats(n):
    e = rom[base_stats + n * 28: base_stats + n * 28 + 28]
    hp, atk, df, spe, spa, spd, t1, t2, catch, exp = e[:10]
    ev = struct.unpack("<H", e[10:12])[0]
    return {
        "hp": hp, "attack": atk, "defense": df, "speed": spe, "specialAttack": spa, "specialDefense": spd,
        "types": [TYPES[t1]] if t1 == t2 else [TYPES[t1], TYPES[t2]],
        "catchRate": catch, "baseExp": exp,
        "evYield": {"hp": ev & 3, "attack": (ev >> 2) & 3, "defense": (ev >> 4) & 3, "speed": (ev >> 6) & 3, "specialAttack": (ev >> 8) & 3, "specialDefense": (ev >> 10) & 3},
        "genderRatio": e[16], "growthRate": GROWTH[e[19]],
    }


# --- evolutions (5 x 8 bytes/species) ---------------------------------------
evo_sig = find_unique(bytes([4, 0, 16, 0, 2, 0, 0, 0]), "Bulbasaur -> Ivysaur evolution")
evo_table = evo_sig - 40 * 1


def species_evolutions(n):
    out = []
    for k in range(5):
        method, param, target = struct.unpack("<HHH", rom[evo_table + n * 40 + k * 8: evo_table + n * 40 + k * 8 + 6])
        if method == 0:
            continue
        if 1 <= target <= 151:
            out.append({"method": EVO_METHODS.get(method, str(method)), "param": param, "to": DEX[target - 1]})
    return out


# --- level-up learnsets ------------------------------------------------------
# Bulbasaur: Tackle(33) L1, Growl(45) L4 -> halfwords (level<<9 | move)
ls_sig = find_unique(struct.pack("<HH", (1 << 9) | 33, (4 << 9) | 45), "Bulbasaur learnset")
ls_ptr = struct.pack("<I", 0x08000000 + ls_sig)
ptr_hit = find_unique(ls_ptr, "learnset pointer")
ls_table = ptr_hit - 4 * 1


def species_learnset(n):
    p = struct.unpack("<I", rom[ls_table + n * 4: ls_table + n * 4 + 4])[0] - 0x08000000
    moves = []
    while True:
        v = struct.unpack("<H", rom[p: p + 2])[0]
        if v == 0xFFFF:
            break
        moves.append({"level": v >> 9, "move": v & 0x1FF})
        p += 2
    return moves


# --- moves (12 bytes/move; Pound = move 1) ----------------------------------
pound = find_unique(bytes([0, 40, 0, 100, 35]), "Pound")
move_table = pound - 12
name_sig = None
# gMoveNames: 13 bytes each; "POUND" = move 1
enc = bytes([0xBB + ord(c) - 65 for c in "POUND"]) + b"\xff"
name_pos = rom.find(enc)
move_names = name_pos - 13


def move_name(n):
    return decode(move_names + n * 13, 13).title().replace("-", " ")


def slug(name):
    return name.lower().replace(" ", "-").replace("'", "")


MOVE_COUNT = 354
moves = {}
for m in range(1, MOVE_COUNT):
    e = rom[move_table + m * 12: move_table + m * 12 + 12]
    effect, power, mtype, acc, pp, chance, target, priority = e[:8]
    name = move_name(m)
    if not name.strip() or "?" in name:
        continue
    moves[m] = {
        "id": slug(name), "name": name, "type": TYPES[mtype],
        "category": "status" if power == 0 else ("special" if mtype >= 10 else "physical"),
        "power": power or None, "accuracy": acc or None, "pp": pp,
        "effect": effect, "effectChance": chance, "target": target, "priority": priority - 256 if priority > 127 else priority,
    }

species = {}
for n in range(1, 152):
    data = species_stats(n)
    data["id"] = DEX[n - 1]
    data["dex"] = n
    data["evolutions"] = species_evolutions(n)
    data["learnset"] = [
        {"level": e["level"], "move": moves[e["move"]]["id"]}
        for e in species_learnset(n)
        if e["move"] in moves
    ]
    species[DEX[n - 1]] = data

# sanity checks against well-known values
assert species["pikachu"]["hp"] == 35 and species["pikachu"]["types"] == ["electric"], "Pikachu stats"
assert species["charizard"]["types"] == ["fire", "flying"], "Charizard types"
assert species["bulbasaur"]["evolutions"][0]["to"] == "ivysaur", "Bulbasaur evolution"
assert species["bulbasaur"]["learnset"][0] == {"level": 1, "move": "tackle"}, "Bulbasaur learnset"
assert moves[1]["id"] == "pound" and moves[33]["id"] == "tackle", "move table"

out = Path(__file__).resolve().parents[2] / "packages" / "game-data" / "data"
out.mkdir(parents=True, exist_ok=True)
(out / "kanto-species.json").write_text(json.dumps(species, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
(out / "kanto-moves.json").write_text(json.dumps({m["id"]: m for m in moves.values()}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"species={len(species)} moves={len(moves)} -> {out}")
