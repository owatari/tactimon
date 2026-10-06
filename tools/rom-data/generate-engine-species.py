#!/usr/bin/env python3
"""Generate packages/battle-engine/src/generated/kanto.ts from the ROM-extracted
JSON (see extract-kanto-data.py).

Adds every Kanto species the hand-written engine tables do not have yet, plus
the damage/status moves those species learn that the engine can express with
its existing effect vocabulary. Hand-written entries always win.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "packages" / "game-data" / "data"
ENGINE = ROOT / "packages" / "battle-engine" / "src"
species = json.loads((DATA / "kanto-species.json").read_text(encoding="utf-8"))
moves = json.loads((DATA / "kanto-moves.json").read_text(encoding="utf-8"))
duel = (ENGINE / "duel.ts").read_text(encoding="utf-8")


def union_members(name):
    m = re.search(r"export type %s =\s*((?:\s*\|\s*\"[a-z0-9-]+\")+)" % name, duel)
    return re.findall(r'"([a-z0-9-]+)"', m.group(1)) if m else []


HAND_SPECIES = set(union_members("StarterSpeciesId") + union_members("HandWildSpeciesId") + union_members("TrainerSpeciesId"))
HAND_MOVES = set(union_members("HandDuelMoveId"))
if not HAND_SPECIES or not HAND_MOVES:
    sys.exit("run after duel.ts exposes HandWildSpeciesId / HandDuelMoveId")

NEW = [s for s in species if s not in HAND_SPECIES]

# ---- move conversion -------------------------------------------------------
STATUS_BY_NAME = {
    "harden": ("defense-up", None), "defense-curl": ("defense-up", None), "withdraw": ("defense-up", None),
    "barrier": ("defense-up", None), "acid-armor": ("defense-up", None),
    "growth": ("special-attack-up", None), "double-team": ("evasion-up", None), "minimize": ("evasion-up", None),
    "growl": ("attack-down", None), "leer": ("defense-down", None), "tail-whip": ("defense-down", None),
    "screech": ("defense-down-2", None), "string-shot": ("speed-down-2", None),
    "smokescreen": ("accuracy-down", None), "sand-attack": ("accuracy-down", None), "flash": ("accuracy-down", None),
    "kinesis": ("accuracy-down", None), "sweet-scent": ("evasion-down", None),
    "recover": ("heal-self", None), "softboiled": ("heal-self", None), "agility": ("speed-up-2", None),
    "sing": (None, "sleep"), "hypnosis": (None, "sleep"), "lovely-kiss": (None, "sleep"), "spore": (None, "sleep"),
    "sleep-powder": (None, "sleep"), "poison-powder": (None, "poison"), "poison-gas": (None, "poison"),
    "toxic": (None, "poison"), "thunder-wave": (None, "paralysis"), "stun-spore": (None, "paralysis"),
    "glare": (None, "paralysis"), "will-o-wisp": (None, "burn"),
}
SEC_STATUS_EFFECT = {2: "poison", 4: "burn", 6: "paralysis"}
DAMAGE_OK = {0, 2, 3, 4, 5, 6, 17, 29, 31, 43, 48, 68, 69, 70, 71, 72, 73, 38}
# Damage moves whose extra ROM behaviour the grid engine cannot express yet are kept as
# plain damage (confusion, flinch, trapping, charge-up lock, stat boosts on hit...).
PLAIN_APPROX = {
    7,    # Selfdestruct / Explosion (user faints, see below)
    27,   # Thrash / Petal Dance / Outrage (no lock-in)
    36,   # Tri Attack
    42,   # Fire Spin / Sand Tomb / Clamp (no trapping)
    44,   # Double Kick / Bonemerang (exactly two hits)
    76,   # Psybeam, Signal Beam, Dizzy Punch (no confusion)
    80,   # Hyper Beam (no recharge turn)
    81,   # Rage
    117,  # Rollout
    128,  # Pursuit
    140,  # Silver Wind / AncientPower (no all-stat boost)
    147,  # Earthquake
    150,  # Stomp
    185,  # Revenge
    198,  # Double-Edge (recoil)
}
DAMAGE_OK |= PLAIN_APPROX
# Fixed-damage moves: ROM effect -> engine effect (the ROM power is a placeholder of 1).
FIXED_DAMAGE = {87: "level-damage", 41: "fixed-damage-40"}
ALIASES = {
    "poisonpowder": "poison-powder",
    "sonicboom": "sonic-boom",
    "solarbeam": "solar-beam",
    "featherdance": "feather-dance",
}


def ts(value):
    return json.dumps(value, ensure_ascii=False)


def convert(m):
    """Return an engine move literal for ROM move m, or None if inexpressible."""
    base = {
        "id": m["id"], "name": m["name"], "type": m["type"], "targeting": "single-enemy",
        "maxPp": m["pp"],
    }
    if m["type"] == "???":
        return None
    if m["effect"] in FIXED_DAMAGE:
        contact = m["type"] in ("normal", "fighting", "bug", "ground", "rock", "ghost", "steel", "flying", "poison") and m["category"] == "physical"
        m2 = dict(
            base, category=m["category"], motion="contact" if contact else "projectile", vfxId="tackle",
            power=1, apCost=4, effect=FIXED_DAMAGE[m["effect"]],
        )
        m2["minRange"], m2["maxRange"] = (1, 1) if contact else (1, 3)
        if m["accuracy"] and m["accuracy"] != 100:
            m2["accuracy"] = m["accuracy"]
        m2["description"] = "Dano fixo gerado a partir dos dados do FireRed."
        return m2
    if m["power"] is None:
        spec = STATUS_BY_NAME.get(m["id"])
        if spec is None:
            return None
        effect, status = spec
        m2 = dict(base, category="status", motion="status", vfxId="growl", power=None, apCost=2)
        self_target = effect in ("defense-up", "special-attack-up", "evasion-up", "heal-self", "speed-up-2")
        m2["targeting"] = "self" if self_target else "single-enemy"
        m2["minRange"], m2["maxRange"] = (0, 0) if self_target else (1, 3)
        if m["accuracy"] and not self_target:
            m2["accuracy"] = m["accuracy"]
        if effect:
            m2["effect"] = effect
        if status:
            m2["secondaryStatus"] = status
            m2["secondaryEffectChance"] = 100
        m2["description"] = "Golpe de status gerado a partir dos dados do FireRed."
        return m2
    if m["effect"] not in DAMAGE_OK or m["power"] == 1:
        return None
    contact = m["type"] in ("normal", "fighting", "bug", "ground", "rock", "ghost", "steel", "flying", "poison") and m["category"] == "physical"
    power = m["power"]
    ap = 3 if power <= 30 else 4 if power <= 55 else 5 if power <= 85 else 6
    m2 = dict(base, category=m["category"], motion="contact" if contact else "projectile", vfxId="tackle", power=power, apCost=ap)
    m2["minRange"], m2["maxRange"] = (1, 1) if contact else (1, 3)
    if m["accuracy"] and m["accuracy"] != 100:
        m2["accuracy"] = m["accuracy"]
    eff = m["effect"]
    if eff in SEC_STATUS_EFFECT:
        m2["secondaryStatus"] = SEC_STATUS_EFFECT[eff]
        m2["secondaryEffectChance"] = m["effectChance"] or 10
    elif eff == 3:
        m2["effect"] = "drain-half"
    elif eff == 29:
        m2["multiHit"] = "two-to-five"
    elif eff == 48:
        m2["recoilDamageFraction"] = 0.25
    elif eff == 198:
        m2["recoilDamageFraction"] = 0.33
    elif eff == 7:
        # Selfdestruct / Explosion: the user faints (huge recoil), power is halved by the engine's defense rule in the ROM
        m2["recoilDamageFraction"] = 100
        m2["apCost"] = 6
    elif eff == 44:
        m2["multiHit"] = "two"
    elif eff == 80:
        m2["apCost"] = 6
    elif eff == 17:
        m2["alwaysHits"] = True
    elif eff == 38:
        m2["effect"] = "ohko"
        m2["power"] = None
        m2["category"] = "physical"
    m2["description"] = "Golpe gerado a partir dos dados do FireRed."
    return m2


# ---- pick species learnset moves -------------------------------------------
by_id = {m["id"]: m for m in moves.values()}
converted = {}


def get_move(move_id):
    move_id = ALIASES.get(move_id, move_id) if ALIASES.get(move_id) in HAND_MOVES else move_id
    if move_id in HAND_MOVES:
        return move_id
    if move_id not in converted:
        converted[move_id] = convert(by_id[move_id]) if move_id in by_id else None
    return move_id if converted[move_id] else None


evolves_to = {e["to"] for s in species.values() for e in s["evolutions"]}
GROWTH = {"medium-fast": "medium-fast", "medium-slow": "medium-slow", "fast": "fast", "slow": "slow", "erratic": "medium-fast", "fluctuating": "slow"}


def display_name(sid):
    special = {"nidoran-f": "Nidoran♀", "nidoran-m": "Nidoran♂", "mr-mime": "Mr. Mime", "farfetchd": "Farfetch'd"}
    return special.get(sid, "-".join(p.capitalize() for p in sid.split("-")).replace("-", " "))


out_species, out_learn, out_init, out_exp, out_growth, out_catch, out_evo = {}, {}, {}, {}, {}, {}, {}
for sid in NEW:
    s = species[sid]
    learn = []
    seen = set()
    for e in s["learnset"]:
        mid = get_move(e["move"])
        if mid and (e["level"], mid) not in seen:
            seen.add((e["level"], mid))
            learn.append({"level": max(1, e["level"]), "moveId": mid})
    if not learn:
        learn = [{"level": 1, "moveId": "tackle"}]
    stage_level = 15 if s["evolutions"] else (36 if sid in evolves_to else 25)
    known = []
    for e in learn:
        if e["level"] <= stage_level and e["moveId"] not in known:
            known.append(e["moveId"])
    initial = known[-4:] or [learn[0]["moveId"]]
    out_species[sid] = {
        "name": display_name(sid), "type": s["types"][0], "types": s["types"],
        "hp": s["hp"], "attack": s["attack"], "defense": s["defense"],
        "specialAttack": s["specialAttack"], "specialDefense": s["specialDefense"], "speed": s["speed"],
        "moves": initial,
    }
    out_learn[sid] = learn
    out_init[sid] = initial
    out_exp[sid] = s["baseExp"]
    out_growth[sid] = GROWTH[s["growthRate"]]
    out_catch[sid] = s["catchRate"]

# ROM level-up learnsets for the hand-written species too (starters, early wilds, trainer species):
# their old placeholder lists stopped at level 1-13, so those Pokémon never learned anything later.
out_hand_learn = {}
for sid in species:
    if sid not in HAND_SPECIES:
        continue
    learn, seen = [], set()
    for e in species[sid]["learnset"]:
        mid = get_move(e["move"])
        if mid and (e["level"], mid) not in seen:
            seen.add((e["level"], mid))
            learn.append({"level": max(1, e["level"]), "moveId": mid})
    if learn:
        out_hand_learn[sid] = learn

STONES = {93: "sun-stone", 94: "moon-stone", 95: "fire-stone", 96: "thunder-stone", 97: "water-stone", 98: "leaf-stone"}
out_stone = {}
for sid, s_ in species.items():
    for e in s_["evolutions"]:
        if e["to"] not in species:
            continue
        if e["method"] == "level":
            out_evo[sid] = {"level": e["param"], "species": e["to"]}
        elif e["method"] == "trade":
            # No trading yet: trade evolutions happen at level 37 instead.
            out_evo.setdefault(sid, {"level": 37, "species": e["to"]})
        elif e["method"] == "item" and e["param"] in STONES:
            out_stone.setdefault(sid, {})[STONES[e["param"]]] = e["to"]

new_moves = {k: v for k, v in converted.items() if v and k not in HAND_MOVES}
used_moves = {e["moveId"] for l in list(out_learn.values()) + list(out_hand_learn.values()) for e in l} | {m for v in out_init.values() for m in v}
new_moves = {k: v for k, v in new_moves.items() if k in used_moves}

lines = [
    "// Generated by tools/rom-data/generate-engine-species.py — do not edit by hand.",
    'import type { DuelMove } from "../duel";',
    "",
    "export const GENERATED_SPECIES_IDS = %s as const;" % ts(NEW),
    "export type GeneratedSpeciesId = (typeof GENERATED_SPECIES_IDS)[number];",
    "export const GENERATED_MOVE_IDS = %s as const;" % ts(sorted(new_moves)),
    "export type GeneratedMoveId = (typeof GENERATED_MOVE_IDS)[number];",
    "",
]
lines.append("export const GENERATED_SPECIES = %s;" % json.dumps(out_species, ensure_ascii=False, indent=2))
lines.append("export const GENERATED_LEARNSETS = %s;" % json.dumps(out_learn, ensure_ascii=False))
lines.append("export const ROM_HAND_LEARNSETS = %s;" % json.dumps(out_hand_learn, ensure_ascii=False))
lines.append("export const GENERATED_INITIAL_MOVES = %s;" % json.dumps(out_init))
lines.append("export const GENERATED_BASE_EXPERIENCE = %s;" % json.dumps(out_exp))
lines.append("export const GENERATED_GROWTH_RATE = %s;" % json.dumps(out_growth))
lines.append("export const GENERATED_CATCH_RATE = %s;" % json.dumps(out_catch))
lines.append("export const GENERATED_LEVEL_EVOLUTIONS = %s;" % json.dumps(out_evo))
lines.append("export const GENERATED_STONE_EVOLUTIONS = %s;" % json.dumps(out_stone))
lines.append("export const GENERATED_MOVES = %s;" % json.dumps({k: new_moves[k] for k in sorted(new_moves)}, ensure_ascii=False, indent=2))
lines.append("")
gen = ENGINE / "generated"
gen.mkdir(exist_ok=True)
(gen / "kanto.ts").write_text("\n".join(lines), encoding="utf-8")
print(f"species={len(NEW)} moves={len(new_moves)}")
