#!/usr/bin/env python3
"""Generate field obstacles and static encounters for the Kanto mainland maps.

Output: apps/client/lib/generated/worldObstacles.ts
  CUT_TREES, STRENGTH_BOULDERS  (ROM object events: CUT_TREE / PUSHABLE_BOULDER)
  STATIC_POKEMON                (Snorlax, Zapdos, Articuno, Mewtwo)

Requires the local ROM extraction; only the generated TypeScript is versioned.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from rom_lib import ROM, ROOT, WORLD  # noqa: E402

GEN = ROOT / "apps" / "client" / "lib" / "generated"
index = json.loads((ROOT / "tools" / "rom-data" / "generated-maps-index.json").read_text(encoding="utf-8"))
maps = {}
maps.update(index["existing"])
maps.update(index["new"])  # dir -> map id

STATIC = {
    "SNORLAX": "snorlax",
    "ZAPDOS": "zapdos",
    "ARTICUNO": "articuno",
    "MEWTWO": "mewtwo",
}

# ROM item id -> StoryKeyItemId (key items lying on the ground)
KEY_ITEMS = {351: "secret-key", 353: "gold-teeth", 355: "card-key", 356: "lift-key", 359: "silph-scope", 369: "tea"}

trees, boulders, statics, key_balls, silph_doors, slots = [], [], [], [], [], []
mansion_switches = []

# Pokémon Mansion: the shared on-load routine at 0x1A7B7A is a list of `setmetatile x,y,metatile,impassable`
# commands (opcode 0xA2), one segment per switch state, two segments (A, B) per floor.
MANSION_ROUTINE = 0x1A7B7A
MANSION_FLOORS = ["pokemon-mansion-1f", "pokemon-mansion-2f", "pokemon-mansion-3f", "pokemon-mansion-b-1f"]


def mansion_barriers():
    import struct
    segments, current, p = [], [], MANSION_ROUTINE
    while ROM[p] in (0xA2, 0x03):
        if ROM[p] == 0xA2:
            x, y, _meta, impassable = struct.unpack("<HHHH", ROM[p + 1:p + 9])
            current.append((x, y, impassable))
            p += 9
        else:
            segments.append(current)
            current = []
            p += 1
    assert len(segments) == 8, f"unexpected mansion routine ({len(segments)} segments)"
    rows = []
    for floor, (a, b) in zip(MANSION_FLOORS, zip(segments[0::2], segments[1::2])):
        state_a = {(x, y): imp for x, y, imp in a}
        state_b = {(x, y): imp for x, y, imp in b}
        for cell in sorted(set(state_a) & set(state_b)):
            if state_a[cell] != state_b[cell]:
                rows.append({"mapId": floor, "x": cell[0], "y": cell[1], "openIn": "a" if state_a[cell] == 0 else "b"})
    return rows


mansion = mansion_barriers()
cinnabar_quiz = []


def cinnabar_quizzes(world):
    """Cinnabar Gym: six quiz machines (bg events) each open one door (setmetatile block)."""
    import struct
    # on-load script: `07 01 <ptr>` (call if) entries for the six flags, then `04 <ptr>` door blocks
    on_load = struct.unpack("<I", ROM[world["scripts_offset"] + 1:world["scripts_offset"] + 5])[0] - 0x08000000
    body = ROM[on_load:on_load + 200]
    blocks = []
    for i in range(len(body) - 5):
        if body[i] == 0x04 and body[i + 4] == 0x08 and body[i + 3] == 0x16:
            target = struct.unpack("<I", body[i + 1:i + 5])[0] - 0x08000000
            if ROM[target] == 0xA2 and target not in blocks:
                blocks.append(target)
    layout_dir = ROOT / "local-assets" / "extracted" / "firered" / "assets" / "maps" / "layouts" / f"{world['layout_index']:03d}_{world['layout_name'].lower()}"
    layout = json.loads((layout_dir / "layout.json").read_text(encoding="utf-8"))
    doors = []
    for target in blocks:
        cells, q = [], target
        while ROM[q] == 0xA2:
            x, y, _meta, impassable = struct.unpack("<HHHH", ROM[q + 1:q + 9])
            # only the cells that are closed (collision) in the layout are the actual door
            if impassable == 0 and layout["cells"][y * layout["width"] + x]["collision"] != 0:
                cells.append([x, y])
            q += 9
        doors.append(cells)
    machines = {}
    for bg in world["bg_events"]:
        off = bg.get("script_offset")
        if bg["kind"] == 1 and off and ROM[off:off + 4] == bytes([0x69, 0x16, 0x01, 0x40]) and ROM[off + 6] == 0x05:
            routine = struct.unpack("<I", ROM[off + 7:off + 11])[0]
            machines.setdefault(routine, []).append([bg["x"], bg["y"]])
    return doors, list(machines.values())
for d, map_id in sorted(maps.items()):
    path = WORLD / d / "world.json"
    if not path.exists():
        continue
    world = json.loads(path.read_text(encoding="utf-8"))
    if map_id.startswith("silph-co-"):
        # Card Key doors: 2x2 bg events whose script starts with `lockall; setvar 0x4001, n`
        groups = {}
        for bg in world["bg_events"]:
            off = bg.get("script_offset")
            if bg["kind"] == 0 and off and ROM[off:off + 4] == bytes([0x69, 0x16, 0x01, 0x40]):
                groups.setdefault(off, []).append([bg["x"], bg["y"]])
        for n, cells in enumerate(groups.values()):
            silph_doors.append({"id": f"{map_id}-door-{n + 1}", "mapId": map_id, "cells": sorted(cells)})
    if map_id == "cinnabar-island-gym":
        doors, machine_cells = cinnabar_quizzes(world)
        assert len(doors) == 6 and len(machine_cells) == 6, (len(doors), len(machine_cells))
        for n, (door, cells) in enumerate(zip(doors, machine_cells)):
            cinnabar_quiz.append({"id": n + 1, "mapId": map_id, "machine": cells, "door": door})
    if map_id.startswith("pokemon-mansion-"):
        for bg in world["bg_events"]:
            off = bg.get("script_offset")
            if bg["kind"] == 1 and off and ROM[off:off + 4] == bytes([0x69, 0x16, 0x04, 0x80]):
                mansion_switches.append({"mapId": map_id, "x": bg["x"], "y": bg["y"]})
    # Game Corner slot machines: bg events whose script is `lockall; setvar 0x8004, n; special ...`
    for bg in world["bg_events"]:
        off = bg.get("script_offset")
        if bg["kind"] in (3, 4) and off and ROM[off:off + 4] == bytes([0x69, 0x16, 0x04, 0x80]):
            slots.append({"mapId": map_id, "x": bg["x"], "y": bg["y"], "machine": ROM[off + 4]})
    for o in world["objects"]:
        g = o.get("graphics_name") or ""
        if o["x"] < 0 or o["y"] < 0:
            continue
        entry = {"mapId": map_id, "x": o["x"], "y": o["y"]}
        if g == "ITEM_BALL" and o["script_offset"]:
            b = ROM[o["script_offset"]:o["script_offset"] + 6]
            if b[0] == 0x1A and (b[3] | (b[4] << 8)) in KEY_ITEMS:
                key_balls.append({**entry, "keyItem": KEY_ITEMS[b[3] | (b[4] << 8)]})
        if g == "CUT_TREE":
            trees.append(entry)
        elif g == "PUSHABLE_BOULDER":
            boulders.append(entry)
        elif g in STATIC:
            statics.append({**entry, "species": STATIC[g], "flag": o["flag_id"]})

out = ["// Generated by tools/rom-data/generate-world-obstacles.py — do not edit by hand."]
out.append("export type GeneratedObstacle = { mapId: string; x: number; y: number };")
out.append("export type GeneratedStaticPokemon = GeneratedObstacle & { species: string; flag: number };")
for name, rows in (("CUT_TREES", trees), ("STRENGTH_BOULDERS", boulders)):
    out.append(f"export const {name}: readonly GeneratedObstacle[] = {json.dumps(rows, indent=1)};")
out.append(f"export const STATIC_POKEMON: readonly GeneratedStaticPokemon[] = {json.dumps(statics, indent=1)};")
out.append(f"export const KEY_ITEM_BALLS: readonly (GeneratedObstacle & {{ keyItem: string }})[] = {json.dumps(key_balls, indent=1)};")
out.append(f"export const SILPH_DOORS: readonly {{ id: string; mapId: string; cells: readonly (readonly [number, number])[] }}[] = {json.dumps(silph_doors)};")
out.append(f"export const SLOT_MACHINES: readonly {{ mapId: string; x: number; y: number; machine: number }}[] = {json.dumps(slots)};")
out.append(f"export const MANSION_BARRIERS: readonly {{ mapId: string; x: number; y: number; openIn: \"a\" | \"b\" }}[] = {json.dumps(mansion)};")
out.append(f"export const MANSION_SWITCHES: readonly {{ mapId: string; x: number; y: number }}[] = {json.dumps(mansion_switches)};")
out.append(f"export const CINNABAR_QUIZ: readonly {{ id: number; mapId: string; machine: readonly (readonly [number, number])[]; door: readonly (readonly [number, number])[] }}[] = {json.dumps(cinnabar_quiz)};")
(GEN / "worldObstacles.ts").write_text("\n".join(out) + "\n", encoding="utf-8")
print(len(cinnabar_quiz), "cinnabar quizzes,", len(mansion), "mansion barrier cells,", len(mansion_switches), "switches,", len(slots), "slot machines,", len(silph_doors), "silph doors,", len(key_balls), "key item balls,", len(trees), "cut trees,", len(boulders), "boulders,", len(statics), "static pokemon")
