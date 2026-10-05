#!/usr/bin/env python3
"""Import the remaining mainland Kanto maps from the extracted FireRed data.

Writes:
  apps/client/lib/generated/worldMaps.ts   map definitions + tilesets + sizes
  apps/client/lib/generated/worldWarps.ts  door/stair warps + border connections
  apps/client/scripts/generated-sync.json  files for scripts/sync-assets.mjs

Maps already hand-registered in apps/client/lib/maps.ts keep their code ids and
data; only maps missing from there are generated. Idempotent.
"""
import glob
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / "local-assets" / "extracted" / "firered" / "assets"
WORLD = A / "maps" / "world"
CLIENT = ROOT / "apps" / "client"

maps_ts = (CLIENT / "lib" / "maps.ts").read_text(encoding="utf-8")
hand_ids = set(re.findall(r'^  "([a-z0-9-]+)": \{\n    id: "', maps_ts, re.M))

EXCLUDE = re.compile(
    r"battlecolosseum|tradecenter|recordcorner|unionroom|oneisland|twoisland|threeisland|fourisland|fiveisland|sixisland|sevenisland|"
    r"navelrock|birthisland|mtember|trainertower|prototype|seviiisle|kindleroad|treasurebeach|capebrink|bondbridge|"
    r"pokemoncenter_2f|route\d+_pokemoncenter_2f|ceruleancave|unusedhouse|unusedgatehouse|dummy|hoennbuilding|"
    r"hall?offame|halloffame|rocketwarehouse|dunsparce|berryforest|icefall|lostcave|dottedhole|alteringcave|patternbush|"
    r"resortgorgeous|waterlabyrinth|meadow|memorialpillar|outcastisland|greenpath|waterpath|ruinvalley|sevault|tanoby|"
    r"saffroncity_connection|rockethideout_elevator|silphco_elevator|"
    r"departmentstore_elevator",
    re.I,
)


def kebab(name):
    parts = []
    for chunk in name.split("_"):
        chunk = re.sub(r"([a-z])([A-Z])", r"\1 \2", chunk)
        chunk = re.sub(r"([A-Za-z])(\d)", r"\1 \2", chunk)
        parts += chunk.lower().split()
    return "-".join(parts)


def humanize(name):
    parts = []
    for chunk in name.split("_"):
        chunk = re.sub(r"([a-z])([A-Z])", r"\1 \2", chunk)
        chunk = re.sub(r"([A-Za-z])(\d)", r"\1 \2", chunk)
        parts.append(chunk)
    return " ".join(parts)


# ---- known hand-registered dirs (id -> dir) ---------------------------------
# code id -> FireRed world dir for maps registered by hand in maps.ts
known_dirs = json.loads(
    (ROOT / "tools" / "rom-data" / "hand-map-dirs.json").read_text(encoding="utf-8")
)

world = {}
dirs = {}
for d in sorted(os.listdir(WORLD)):
    j = json.loads((WORLD / d / "world.json").read_text(encoding="utf-8"))
    world[d] = j

by_name = {j["name"]: d for d, j in world.items()}

# existing: derive from the hand map ids by matching kebab(name)
existing = {}
for d, j in world.items():
    code = kebab(j["name"])
    if code in hand_ids:
        existing[d] = code
# hand ids whose names differ from kebab(name)
for code, d in known_dirs.items():
    if d:
        existing[d] = code

new = {}
for d, j in world.items():
    if d in existing:
        continue
    if EXCLUDE.search(d) or EXCLUDE.search(j["name"]):
        continue
    idx = int(d.split("_", 1)[0])
    if idx < 5:
        continue
    new[d] = kebab(j["name"])

code_of = {**existing, **new}
code_by_index = {world[d]["index"]: c for d, c in code_of.items()}

layouts = {}
for p in glob.glob(str(A / "maps" / "layouts" / "*" / "layout.json")):
    l = json.loads(Path(p).read_text(encoding="utf-8"))
    layouts[l["index"]] = (Path(p).parent.name, l)

TILESET_DIRS = {re.sub(r"[^a-z0-9]", "", d.split("_", 1)[1]): d for d in os.listdir(A / "tilesets")}
EXISTING_PUBLIC = {
    "general": "general", "pallettown": "pallet-town", "viridiancity": "viridian-city", "pewtercity": "pewter-city",
    "ceruleancity": "cerulean-city", "building": "building", "seacottage": "sea-cottage", "burgledhouse": "burgled-house",
    "lab": "lab", "mart": "mart", "pewtergym": "pewter-gym", "ceruleangym": "cerulean-gym", "vermiliongym": "vermilion-gym",
    "pokemoncenter": "pokemon-center", "undergroundpath": "underground-path", "vermilioncity": "vermilion-city",
    "ssanne": "ss-anne", "cave": "cave", "viridianforest": "viridian-forest", "genericbuilding2": "generic-building-2",
    "genericbuilding1": "generic-building-1", "museum": "museum", "bikeshop": "bike-shop", "school": "school",
    "fanclubdaycare": "fan-club-daycare",
}
# Tilesets already synced by the hand-written list.
ALREADY_SYNCED = set(EXISTING_PUBLIC.values())


def tileset_key(name):
    n = re.sub(r"[^a-z0-9]", "", name.lower())
    return n, EXISTING_PUBLIC.get(n, n)


needed_tilesets = {}
sync = []
map_defs = {}
sizes = {}

for d, j in world.items():
    if d in code_of:
        l = layouts[j["layout_index"]][1]
        sizes[code_of[d]] = [l["width"], l["height"]]

for d, code in new.items():
    j = world[d]
    lname, l = layouts[j["layout_index"]]
    prim_n, prim = tileset_key(l["primary_tileset"])
    sec_n, sec = tileset_key(l["secondary_tileset"])
    for n, pub in ((prim_n, prim), (sec_n, sec)):
        if n not in TILESET_DIRS:
            sys.exit(f"unknown tileset {n} for {d}")
        needed_tilesets[pub] = n
    sync.append([f"maps/layouts/{lname}/layout.json", f"maps/{code}/layout.json"])
    sync.append([f"maps/layouts/{lname}/preview.png", f"maps/{code}/preview.png"])
    sync.append([f"maps/world/{d}/world.json", f"maps/{code}/world.json", "optional"])
    map_defs[code] = {
        "id": code, "label": humanize(j["name"]),
        "layoutUrl": f"/game-assets/maps/{code}/layout.json",
        "previewUrl": f"/game-assets/maps/{code}/preview.png",
        "worldUrl": f"/game-assets/maps/{code}/world.json",
        "fallbackMusicId": j["music"], "primary": prim, "secondary": sec,
    }

tilesets = {}
for pub, n in sorted(needed_tilesets.items()):
    tilesets[pub] = {
        "tilesUrl": f"/game-assets/tilesets/{pub}/tiles.4bpp",
        "palettesUrl": f"/game-assets/tilesets/{pub}/palettes.gbapal",
        "metatilesUrl": f"/game-assets/tilesets/{pub}/metatiles.bin",
        "attributesUrl": f"/game-assets/tilesets/{pub}/attributes.bin",
    }
    if pub not in ALREADY_SYNCED:
        src = TILESET_DIRS[n]
        for f in ("tiles.4bpp", "palettes.gbapal", "metatiles.bin", "attributes.bin"):
            sync.append([f"tilesets/{src}/{f}", f"tilesets/{pub}/{f}"])

# ---- warps -----------------------------------------------------------------
EXTERIOR_TYPES = {1, 2, 3, 6, 7}


def cell(d, x, y):
    l = layouts[world[d]["layout_index"]][1]
    if x < 0 or y < 0 or x >= l["width"] or y >= l["height"]:
        return None
    return l["cells"][y * l["width"] + x]


open_cells = {}


def spawn_for(d, x, y):
    exterior = world[d]["map_type"] in EXTERIOR_TYPES
    order = [(0, 1), (0, -1), (-1, 0), (1, 0)] if exterior else [(0, -1), (0, 1), (-1, 0), (1, 0)]
    tiles = {(w["x"], w["y"]) for w in world[d]["warps"]}
    for dx, dy in order:
        c = cell(d, x + dx, y + dy)
        if c is not None and c["collision"] == 0 and (x + dx, y + dy) not in tiles:
            return x + dx, y + dy
    # Closed door (League rooms): the cell inside the door opens on arrival.
    dx, dy = (0, 1) if exterior else (0, -1)
    inside = cell(d, x + dx, y + dy)
    if inside is not None:
        open_cells.setdefault(code_of[d], set()).add((x + dx, y + dy))
        return x + dx, y + dy
    return x, y


warps = {}
first_inbound = {}
for d, j in world.items():
    if d not in code_of:
        continue
    for w in j["warps"]:
        t = by_name.get(w["target_map"])
        if not t or t not in code_of:
            continue
        if d not in new and t not in new:
            continue
        tw = world[t]["warps"]
        if w["warp_id"] >= len(tw):
            continue
        dest = tw[w["warp_id"]]
        sx, sy = spawn_for(t, dest["x"], dest["y"])
        warps[f"{code_of[d]}:{w['x']},{w['y']}"] = [code_of[t], sx, sy]
        first_inbound.setdefault(code_of[t], (sx, sy))

# ---- connections (generated map on at least one side) ---------------------
connections = {}
for d, j in world.items():
    if d not in code_of:
        continue
    for c in j["connections"]:
        t = by_name.get(c["target_map"])
        if not t or t not in code_of:
            continue
        if d not in new and t not in new:
            continue
        connections.setdefault(code_of[d], []).append({"direction": c["direction"], "offset": c["offset"], "target": code_of[t]})

for code, md in map_defs.items():
    w, h = sizes[code]
    sp_ = first_inbound.get(code)
    if sp_ is None:
        sp_ = (w // 2, h // 2)
    md["spawn"] = {"x": sp_[0], "y": sp_[1]}

# ---- emit ------------------------------------------------------------------
gen = CLIENT / "lib" / "generated"
gen.mkdir(exist_ok=True)


def js(v, indent=None):
    return json.dumps(v, ensure_ascii=False, indent=indent)


maps_out = [
    "// Generated by tools/rom-data/generate-world-maps.py — do not edit by hand.",
    'import type { TilesetAssetDefinition } from "../maps";',
    "",
    "export const GENERATED_TILESETS: Record<string, TilesetAssetDefinition> = %s;" % js(tilesets, 2),
    "",
    "export const GENERATED_MAP_SIZES: Record<string, [number, number]> = %s;" % js(sizes),
    "",
    "export const GENERATED_MAP_DEFINITIONS: Record<",
    "  string,",
    "  {",
    "    id: string;",
    "    label: string;",
    "    layoutUrl: string;",
    "    previewUrl: string;",
    "    worldUrl: string;",
    "    spawn: { x: number; y: number };",
    "    fallbackMusicId: number;",
    "    primary: string;",
    "    secondary: string;",
    "  }",
    "> = %s;" % js(map_defs, 2),
    "",
]
(gen / "worldMaps.ts").write_text("\n".join(maps_out), encoding="utf-8")

warps_out = [
    "// Generated by tools/rom-data/generate-world-maps.py — do not edit by hand.",
    "export const WORLD_WARPS: Readonly<",
    "  Record<string, readonly [string, number, number]>",
    "> = %s;" % js(warps, 1),
    "",
    "export type WorldConnection = {",
    '  direction: "north" | "south" | "west" | "east";',
    "  offset: number;",
    "  target: string;",
    "};",
    "export const WORLD_CONNECTIONS: Readonly<",
    "  Record<string, readonly WorldConnection[]>",
    "> = %s;" % js(connections, 1),
    "",
    "/** Cells that are closed doors in the layout but open when entered. */",
    "export const WORLD_OPEN_CELLS: Readonly<",
    "  Record<string, readonly (readonly [number, number])[]>",
    "> = %s;" % js({k: sorted(v) for k, v in open_cells.items()}, 1),
    "",
]
(gen / "worldWarps.ts").write_text("\n".join(warps_out), encoding="utf-8")
(CLIENT / "scripts" / "generated-sync.json").write_text(js(sync, 0) + "\n", encoding="utf-8")
(ROOT / "tools" / "rom-data" / "generated-maps-index.json").write_text(js({"new": new, "existing": existing}, 1) + "\n", encoding="utf-8")
print(f"new maps={len(new)} warps={len(warps)} connections={sum(len(v) for v in connections.values())} tilesets={len(tilesets)} sync={len(sync)}")
