#!/usr/bin/env python3
"""Finds the NPCs that change tile in the FireRed event scripts (NPC position audit).

For every map it walks the scripts reachable from the object, coord-event, bg-event and map-script
entries (`fr_script.Walk`) and reports `setobjectxy` / `setobjectxyperm` (NPC teleports),
`applymovement` (NPC walks), `addobject` / `removeobject` / `showobjectat` / `hideobjectat` and
`setobjectmovementtype` on the map's own objects, next to the object's home tile.

Usage: python tools/rom-data/scan-npc-moves.py [--json out.json] [map-id ...]
Needs the extracted maps (apps/client/public/game-assets/maps/*/world.json) and the local ROM.
"""
import collections
import glob
import json
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fr_script import ROM_BASE, Walk, movement_steps  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
ROM = (ROOT / "local-assets" / "roms" / "firered.gba").read_bytes()


def entries_of(data):
    """Script entry points of a map: object / coord / bg scripts and the map-script tables."""
    starts = []
    starts += [o["script_offset"] for o in data["objects"] if o.get("script_offset")]
    starts += [c.get("script_offset") for c in data.get("coord_events", []) if c.get("script_offset")]
    starts += [b.get("script_offset") for b in data.get("bg_events", []) if b.get("script_offset")]
    table = data.get("scripts_offset")
    if table:
        pos = table
        while pos + 5 <= len(ROM) and ROM[pos] != 0:
            kind = ROM[pos]
            target = struct.unpack("<I", ROM[pos + 1 : pos + 5])[0] - ROM_BASE
            if kind in (2, 4, 6, 7) and 0 <= target < len(ROM):
                if kind == 2:
                    starts.append(target)
                else:
                    # table of (var u16, value u16, script ptr u32) ending with var 0
                    row = target
                    while row + 8 <= len(ROM) and struct.unpack("<H", ROM[row : row + 2])[0] != 0:
                        script = struct.unpack("<I", ROM[row + 4 : row + 8])[0] - ROM_BASE
                        if 0 <= script < len(ROM):
                            starts.append(script)
                        row += 8
            elif kind == 3 and 0 <= target < len(ROM):
                starts.append(target)
            pos += 5
    return [s for s in starts if s]


def scan_map(name, data):
    walk = Walk(ROM)
    for start in entries_of(data):
        walk.run(start)
    objects = {o["local_id"]: o for o in data["objects"]}
    out = []
    for pos, command, args in walk.events:
        if command in ("setflag", "clearflag"):
            continue
        local = struct.unpack("<H", args[:2])[0]
        entry = {"map": name, "command": command, "local_id": local, "rom": pos, "known": local in objects}
        obj = objects.get(local)
        if obj:
            entry.update(graphics=obj["graphics_name"], home=[obj["x"], obj["y"]], movement_type=obj["movement_type"], flag=obj["flag_id"])
        if command in ("setobjectxy", "setobjectxyperm"):
            entry["x"], entry["y"] = struct.unpack("<HH", args[2:6])
        elif command in ("applymovement", "applymovementat"):
            entry["movement_ptr"] = struct.unpack("<I", args[2:6])[0] - ROM_BASE
            if 0 <= entry["movement_ptr"] < len(ROM):
                (entry["dx"], entry["dy"]), entry["steps"] = movement_steps(ROM, entry["movement_ptr"])
        elif command == "turnobject":
            entry["facing"] = args[2]
        elif command == "setobjectmovementtype":
            entry["movement_type_new"] = args[2]
        out.append(entry)
    return out, walk


if __name__ == "__main__":
    only = [a for a in sys.argv[1:] if not a.startswith("--") and not a.endswith(".json")]
    results = []
    quality = []
    unknown_total = {}
    for p in sorted(glob.glob(str(ROOT / "apps/client/public/game-assets/maps/*/world.json"))):
        name = Path(p).parent.name
        if only and name not in only:
            continue
        data = json.loads(Path(p).read_text(encoding="utf-8"))
        entries, walk = scan_map(name, data)
        results += entries
        quality.append((name, walk.scripts, walk.unknown))
        for op, n in walk.unknown_ops.items():
            unknown_total[op] = unknown_total.get(op, 0) + n
    kept = collections.defaultdict(set)
    for e in results:
        if e["command"] == "copyobjectxytoperm" and e["known"]:
            kept[e["map"]].add(e["local_id"])
    print("== setobjectxy / setobjectxyperm (the NPC is placed on this tile) ==")
    for e in results:
        if e["command"] in ("setobjectxy", "setobjectxyperm") and e["known"]:
            print(f"{e['map']}: {e['command']} local {e['local_id']} ({e['graphics']}, home {tuple(e['home'])}, mt {e['movement_type']}) -> ({e['x']},{e['y']}) @0x{e['rom']:x}")
    print()
    print("== applymovement that walks an NPC (net displacement; * = position is kept afterwards: copyobjectxytoperm) ==")
    seen = set()
    for e in results:
        if e["command"] in ("applymovement", "applymovementat") and e["known"] and e.get("steps") and e["local_id"] != 255 and e["local_id"] != 0xFF:
            key = (e["map"], e["local_id"], e["dx"], e["dy"])
            if key in seen:
                continue
            seen.add(key)
            flag = "*" if e["local_id"] in kept[e["map"]] else " "
            print(f"{flag} {e['map']}: local {e['local_id']} ({e['graphics']}, home {tuple(e['home'])}, mt {e['movement_type']}, flag {e['flag']}) walks ({e['dx']:+d},{e['dy']:+d}) in {e['steps']} steps @0x{e['rom']:x}")
    bad = [(n, s, u) for n, s, u in quality if u]
    print(f"\n{sum(s for _, s, _ in quality)} scripts walked, {sum(u for _, _, u in quality)} stopped on unknown opcodes in {len(bad)} maps")
    if unknown_total:
        print("unknown opcodes:", {hex(k): v for k, v in sorted(unknown_total.items(), key=lambda kv: -kv[1])})
    if "--json" in sys.argv:
        Path(sys.argv[sys.argv.index("--json") + 1]).write_text(json.dumps(results, indent=1), encoding="utf-8")
