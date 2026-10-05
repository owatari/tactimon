#!/usr/bin/env python3
"""Generate per-map content for the maps imported by generate-world-maps.py.

Outputs (apps/client/lib/generated/):
  worldEncounters.ts  land encounter tables (gWildMonHeaders)
  worldItems.ts       extra Bag items (name + ROM item id) used by pickups/marts
  worldPickups.ts     item balls and hidden items (no TMs, berries or held items)
  worldServices.ts    Poké Mart clerks/stock and Pokémon Center nurses
  worldTrainers.ts    trainers (gTrainers) with English ROM text + engine moves
  worldTexts.ts       NPC and sign text in English (pt-BR overrides live in
                      lib/worldTexts.ts)

Requires the local ROM; only the generated TypeScript is versioned.
"""
import json
import re
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from rom_lib import (  # noqa: E402
    A, DATA, DEX, ITEM_NAMES, ITEM_PRICES, ROM, ROOT, SPECIES, WORLD, decode_text, ptr,
)

CLIENT = ROOT / "apps" / "client"
GEN = CLIENT / "lib" / "generated"
index = json.loads((ROOT / "tools" / "rom-data" / "generated-maps-index.json").read_text(encoding="utf-8"))
NEW = index["new"]  # dir -> code
world = {d: json.loads((WORLD / d / "world.json").read_text(encoding="utf-8")) for d in NEW}


def js(v, indent=None):
    return json.dumps(v, ensure_ascii=False, indent=indent)


def kebab_slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower().replace("é", "e")).strip("-")


# ---- items -------------------------------------------------------------------
items_ts = (CLIENT / "lib" / "items.ts").read_text(encoding="utf-8")
HAND_BAG = {int(n): sid for sid, n in re.findall(r'"?([a-z-]+)"?: \{ name: "[^"]+", firered: (\d+)', items_ts)}
ENGINE_ITEMS = {13: "potion", 4: "poke-ball"}
icon_dir = CLIENT / "public" / "game-assets" / "firered" / "ui" / "items"
ICON_SLUG = {}
if icon_dir.exists():
    for f in icon_dir.iterdir():
        m = re.match(r"(\d{3})_(.+)\.png$", f.name)
        if m and not re.fullmatch(r"[0-9a-f]{3}", m.group(2)):
            ICON_SLUG[int(m.group(1))] = m.group(2).replace("_", "-")
if not ICON_SLUG:
    sys.exit("run sync-assets first (item icons missing)")


def allowed_item(i):
    # berries, held items and TMs/HMs are reserved for dungeon/raid systems
    return 1 <= i <= 132 or (176 <= i <= 178) or False


def allowed_pickup_item(i):
    return 1 <= i <= 132 and not (i in range(111, 133))  # no shards/mail/other clutter


extra_items = {}


def item_id(i):
    if i in ENGINE_ITEMS:
        return ENGINE_ITEMS[i]
    if i in HAND_BAG:
        return HAND_BAG[i]
    slug = ICON_SLUG.get(i) or kebab_slug(ITEM_NAMES[i])
    extra_items[slug] = {"name": ITEM_NAMES[i].title().replace("Poke", "Poké"), "firered": i}
    return slug


# ---- encounters ------------------------------------------------------------
enc_out = {}
for d, code in NEW.items():
    j = world[d]
    pat = bytes([j["group"], j["map_num"], 0, 0])
    i = -1
    while True:
        i = ROM.find(pat, i + 1)
        if i < 0:
            break
        lp = ptr(struct.unpack("<I", ROM[i + 4:i + 8])[0])
        if lp is None or lp + 8 > len(ROM):
            continue
        rate = ROM[lp]
        tp = ptr(struct.unpack("<I", ROM[lp + 4:lp + 8])[0])
        if tp is None or not 1 <= rate <= 60 or tp + 48 > len(ROM):
            continue
        slots = []
        ok = True
        weights = [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1]
        for k in range(12):
            lo, hi, sp = struct.unpack("<BBH", ROM[tp + k * 4:tp + k * 4 + 4])
            if not 1 <= sp <= 151 or not 1 <= lo <= hi <= 100:
                ok = False
                break
            slots.append({"weight": weights[k], "species": DEX[sp], "level": (lo + hi) // 2})
        if ok:
            cave = j["cave"] == 1 or j["map_type"] in (4, 8)
            enc_out[code] = {"encounterRate": rate, "terrain": "cave" if cave else "grass", "slots": slots}
            break

# ---- pickups -----------------------------------------------------------------
pickups = []
skipped_items = []
for d, code in NEW.items():
    j = world[d]
    used = set()
    for o in j["objects"]:
        if o["graphics_name"] != "ITEM_BALL" or not o["script_offset"]:
            continue
        b = ROM[o["script_offset"]:o["script_offset"] + 6]
        if b[0] != 0x1A:
            continue
        item = b[3] | (b[4] << 8)
        if not allowed_pickup_item(item):
            skipped_items.append((code, item))
            continue
        sid = item_id(item)
        pid = f"{code}-{sid}"
        if pid in used:
            pid += f"-{o['x']}-{o['y']}"
        used.add(pid)
        pickups.append({"id": pid, "mapId": code, "itemId": sid, "itemName": ITEM_NAMES[item].title().replace("Poke", "Poké"), "x": o["x"], "y": o["y"]})
    for bg in j["bg_events"]:
        if bg["kind"] != 7:
            continue
        raw = bg["raw_value"]
        item = raw & 0xFFFF
        if not allowed_pickup_item(item):
            skipped_items.append((code, item))
            continue
        sid = item_id(item)
        pid = f"{code}-hidden-{sid}"
        if pid in used:
            pid += f"-{bg['x']}-{bg['y']}"
        used.add(pid)
        pickups.append({"id": pid, "mapId": code, "itemId": sid, "itemName": ITEM_NAMES[item].title().replace("Poke", "Poké"), "x": bg["x"], "y": bg["y"], "hidden": True})

# ---- services (marts, nurses) ------------------------------------------------
marts = {}
nurses = {}
for d, code in NEW.items():
    j = world[d]
    clerks = [o for o in j["objects"] if o["graphics_name"] == "CLERK" and o["script_offset"]]
    for n, o in enumerate(clerks):
        stock = None
        seen = set()
        queue = [o["script_offset"]]
        while queue and stock is None:
            off = queue.pop(0)
            if off in seen or off is None:
                continue
            seen.add(off)
            b = ROM[off:off + 200]
            for q in range(len(b) - 5):
                if b[q] == 0x86 and b[q + 4] == 0x08:
                    p = ptr(struct.unpack("<I", b[q + 1:q + 5])[0])
                    ids = []
                    while True:
                        it = struct.unpack("<H", ROM[p:p + 2])[0]
                        if it == 0:
                            break
                        ids.append(it)
                        p += 2
                    stock = ids
                    break
                if b[q] in (4, 5) and b[q + 4] == 0x08 and len(seen) < 6:
                    queue.append(ptr(struct.unpack("<I", b[q + 1:q + 5])[0]))
                if b[q] in (6, 7) and b[q + 1] < 6 and b[q + 5] == 0x08 and len(seen) < 6:
                    queue.append(ptr(struct.unpack("<I", b[q + 2:q + 6])[0]))
        if not stock:
            continue
        entries = []
        for it in stock:
            if not allowed_pickup_item(it) and it not in (4, 13):
                continue
            sid = item_id(it)
            entries.append({"id": sid, "name": ITEM_NAMES[it].title().replace("Poke", "Poké"), "price": ITEM_PRICES[it]})
        mart_id = code if len(clerks) == 1 else f"{code}@{o['x']},{o['y']}"
        marts[mart_id] = {"mapId": code, "x": o["x"], "y": o["y"], "stock": entries}
    nurse = [o for o in j["objects"] if o["graphics_name"] == "NURSE"]
    if nurse:
        nurses[code] = {"x": nurse[0]["x"], "y": nurse[0]["y"]}

GEN.mkdir(exist_ok=True)
HEADER = "// Generated by tools/rom-data/generate-world-content.py — do not edit by hand.\n"

(GEN / "worldItems.ts").write_text(
    HEADER + "export const GENERATED_BAG_ITEMS = %s as const;\n" % js(dict(sorted(extra_items.items())), 2),
    encoding="utf-8",
)
(GEN / "worldEncounters.ts").write_text(
    HEADER
    + 'import type { LandEncounterTable } from "../wildEncounters";\n\n'
    + "export const GENERATED_LAND_ENCOUNTERS: Readonly<Record<string, LandEncounterTable>> = %s as unknown as Record<string, LandEncounterTable>;\n" % js(enc_out, 1),
    encoding="utf-8",
)
(GEN / "worldPickups.ts").write_text(
    HEADER
    + 'import type { OverworldPickupDefinition } from "../overworldPickups";\n\n'
    + "export const GENERATED_PICKUPS: readonly OverworldPickupDefinition[] = %s as unknown as OverworldPickupDefinition[];\n" % js(pickups, 1),
    encoding="utf-8",
)
(GEN / "worldServices.ts").write_text(
    HEADER
    + "export type GeneratedMart = {\n  mapId: string;\n  x: number;\n  y: number;\n  stock: { id: string; name: string; price: number }[];\n};\n\n"
    + "export const GENERATED_MARTS: Readonly<Record<string, GeneratedMart>> = %s;\n\n" % js(marts, 1)
    + "export const GENERATED_NURSES: Readonly<Record<string, { x: number; y: number }>> = %s;\n" % js(nurses, 1),
    encoding="utf-8",
)
# ---- trainers ----------------------------------------------------------------
duel_ts = (ROOT / "packages" / "battle-engine" / "src" / "duel.ts").read_text(encoding="utf-8")
kanto_ts = (ROOT / "packages" / "battle-engine" / "src" / "generated" / "kanto.ts").read_text(encoding="utf-8")
m_hand = re.search(r"export type HandDuelMoveId =\s*((?:\s*\|\s*\"[a-z0-9-]+\")+)", duel_ts)
IMPLEMENTED_MOVES = set(re.findall(r'"([a-z0-9-]+)"', m_hand.group(1)))
IMPLEMENTED_MOVES |= set(json.loads(re.search(r"GENERATED_MOVE_IDS = (\[.*?\]) as const", kanto_ts).group(1)))
ROM_MOVES = json.loads((DATA / "kanto-moves.json").read_text(encoding="utf-8"))
LEADER_GFX = {"ERIKA", "KOGA", "SABRINA", "BLAINE", "GIOVANNI", "LORELEI", "BRUNO", "AGATHA", "LANCE", "BLUE"}
LEADER_BADGE = {"ERIKA": "rainbow", "KOGA": "soul", "SABRINA": "marsh", "BLAINE": "volcano", "GIOVANNI": "earth"}
CLASS_TITLES = {
    "BUG_CATCHER": "Bug Catcher", "LASS": "Lass", "YOUNGSTER": "Youngster", "SAILOR": "Sailor", "CAMPER": "Camper",
    "PICNICKER": "Picnicker", "HIKER": "Hiker", "BIKER": "Biker", "BURGLAR": "Burglar", "ENGINEER": "Engineer",
    "FISHER": "Fisher", "SWIMMER_M_WATER": "Swimmer", "SWIMMER_F_WATER": "Swimmer", "SWIMMER_M_LAND": "Swimmer",
    "SWIMMER_F_LAND": "Swimmer", "CUE_BALL": "Cue Ball", "GAMER": "Gamer", "BEAUTY": "Beauty", "PSYCHIC_M": "Psychic",
    "PSYCHIC_F": "Psychic", "ROCKER": "Rocker", "JUGGLER": "Juggler", "TAMER": "Tamer", "BIRD_KEEPER": "Bird Keeper",
    "BLACK_BELT": "Black Belt", "SCIENTIST": "Scientist", "GENTLEMAN": "Gentleman", "CHANNELER": "Channeler",
    "ROCKET_M": "Team Rocket", "ROCKET_F": "Team Rocket", "SUPER_NERD": "Super Nerd", "POKEMANIAC": "Pokémaniac",
    "COOLTRAINER_M": "Cooltrainer", "COOLTRAINER_F": "Cooltrainer", "TUBER_M_WATER": "Tuber", "TUBER_F": "Tuber",
    "SIS_AND_BRO": "Sis and Bro", "OLD_MAN_1": "Old Man",
}
CLASS_MONEY = {
    "Bug Catcher": 3, "Lass": 4, "Youngster": 4, "Sailor": 8, "Camper": 5, "Picnicker": 5, "Hiker": 10, "Biker": 5,
    "Burglar": 22, "Engineer": 12, "Fisher": 10, "Swimmer": 2, "Cue Ball": 5, "Gamer": 18, "Beauty": 18, "Psychic": 6,
    "Rocker": 6, "Juggler": 8, "Tamer": 10, "Bird Keeper": 6, "Black Belt": 6, "Scientist": 12, "Gentleman": 18,
    "Channeler": 8, "Team Rocket": 6, "Super Nerd": 6, "Pokémaniac": 15, "Cooltrainer": 12, "Tuber": 1,
}
BASE_TRAINERS = 0x23EAC8
FACE = {7: "north", 8: "south", 9: "west", 10: "east"}
MOVES_BY_NUM = {mv["num"]: mv["id"] for mv in ROM_MOVES.values()}


def png_size(path):
    with open(path, "rb") as f:
        head = f.read(24)
    return struct.unpack(">II", head[16:24])


def read_trainer(tid):
    o = BASE_TRAINERS + tid * 40
    flags = ROM[o]
    name = ""
    for c in ROM[o + 4:o + 16]:
        if c == 0xFF:
            break
        name += chr(65 + c - 0xBB) if 0xBB <= c <= 0xD4 else chr(97 + c - 0xD5) if 0xD5 <= c <= 0xEE else " " if c == 0 else ""
    count = struct.unpack("<I", ROM[o + 32:o + 36])[0]
    pp = struct.unpack("<I", ROM[o + 36:o + 40])[0] - 0x08000000
    mons = []
    for k in range(count):
        if flags & 1:
            e = ROM[pp + k * 16:pp + k * 16 + 16]
            _, lvl, sp = struct.unpack("<HHH", e[:6])
            custom = [MOVES_BY_NUM.get(mv) for mv in struct.unpack("<4H", e[8:16]) if mv]
        else:
            e = ROM[pp + k * 8:pp + k * 8 + 8]
            _, lvl, sp = struct.unpack("<HHH", e[:6])
            custom = []
        if 1 <= sp <= 151:
            mons.append((DEX[sp], lvl, custom))
    return name.title(), mons


def engine_moves(species_id, level, custom):
    picked = [m for m in custom if m and m in IMPLEMENTED_MOVES]
    if len(picked) < 2:
        learned = []
        for e in SPECIES[species_id]["learnset"]:
            if e["level"] <= level and e["move"] in IMPLEMENTED_MOVES and e["move"] not in learned:
                learned.append(e["move"])
        picked = (picked + [m for m in learned[-4:] if m not in picked])[-4:]
    return picked or ["tackle"]


def story_text(offset):
    t = re.sub(r"\s+", " ", decode_text(offset)).strip()
    t = re.sub(r"^[A-Z][A-Z .]{2,}:\s*", "", t)
    return t.replace("{PLAYER}", "Red").replace("{RIVAL}", "Blue")


trainers = []
used_ids = set()
for d, code in NEW.items():
    j = world[d]
    for o in j["objects"]:
        leader_gfx = (o["graphics_name"] or "") in LEADER_GFX
        # Hide flags are unset on a new game, so flagged trainers start visible.
        if (o["trainer_type"] == 0 and not leader_gfx) or (o["graphics_name"] or "") in ("BLUE", "PROF_OAK") or not o["script_offset"]:
            continue
        b = ROM[o["script_offset"]:o["script_offset"] + 160]
        tid = intro = defeat = None
        for q in range(len(b) - 14):
            if b[q] == 0x5C and b[q + 1] <= 9:
                tid = struct.unpack("<H", b[q + 2:q + 4])[0]
                intro = ptr(struct.unpack("<I", b[q + 6:q + 10])[0])
                defeat = ptr(struct.unpack("<I", b[q + 10:q + 14])[0])
                break
        if tid is None:
            continue
        name, mons = read_trainer(tid)
        if not mons:
            continue
        gfx = o["graphics_name"] or ""
        title = CLASS_TITLES.get(gfx)
        leader_badge = LEADER_BADGE.get(name.upper())
        if leader_badge:
            title = "Leader"
        elif title is None:
            title = gfx.replace("_", " ").title() or "Trainer"
        full = f"{title} {name}".strip()
        money = 25 if leader_badge or gfx in ("LORELEI", "BRUNO", "AGATHA", "LANCE", "BLUE", "CHAMPION") else CLASS_MONEY.get(title, 5)
        slug = kebab_slug(f"{code}-{name}")
        if slug in used_ids:
            slug += f"-{o['x']}-{o['y']}"
        used_ids.add(slug)
        sprite = o["sprite_file"]
        if not sprite:
            continue
        sw, sh = png_size(A / sprite)
        trainer = {
            "id": slug, "mapId": code, "name": full,
            "preferredPosition": {"x": o["x"], "y": o["y"]},
            "facing": FACE.get(o["movement_type"], "south"),
            "sightRange": 0 if leader_badge else o["trainer_range_or_berry_id"],
            "spriteUrl": "/game-assets/" + sprite,
            "frameWidth": o["frame_width"] or 16, "frameHeight": o["frame_height"] or 32,
            "sheetWidth": sw, "sheetHeight": sh,
            "challengeText": f"{name}: {story_text(intro)}" if intro else f"{name}: ...",
            "defeatedText": f"{name}: {story_text(defeat)}" if defeat else f"{name}: ...",
            "moneyMultiplier": money,
            "party": [{"species": sp, "level": lv, "moves": engine_moves(sp, lv, cm)} for sp, lv, cm in mons[:6]],
        }
        if leader_badge:
            trainer["badgeId"] = leader_badge
        trainers.append(trainer)

(GEN / "worldTrainers.ts").write_text(
    HEADER
    + 'import type { OverworldTrainerDefinition } from "../trainers";\n\n'
    + "export const GENERATED_TRAINERS: readonly OverworldTrainerDefinition[] = %s as unknown as OverworldTrainerDefinition[];\n" % js(trainers, 1),
    encoding="utf-8",
)
print(f"trainers={len(trainers)}")

print(f"encounters={len(enc_out)} pickups={len(pickups)} extra_items={len(extra_items)} marts={len(marts)} nurses={len(nurses)} skipped_items={len(skipped_items)}")
