# Battle System v0.1

## Board

- Orthogonal movement only (4-dir).
- Movement cost uses Manhattan distance/pathing.
- A tile has one primary occupant unless a future mechanic explicitly overrides it.
- Attack shapes may include diagonal tiles even though movement does not.

## Initiative

Every deployed Pokémon receives an activation. Final Speed is the primary initiative input. Paralysis, Tailwind, Trick Room and move-specific effects can alter ordering. Ties are resolved deterministically by server state.

## Four moves

A Pokémon equips exactly four moves. A tactical move can define Pokémon-compatible type/category/power/accuracy plus AP cost, min/max range, shape/AoE, line of sight, target rules, friendly fire, displacement, terrain/zones and status/stat-stage effects.

Many of the strongest or most strategically valuable moves are intended to be gated behind TMs.

## Damage

The engine preserves familiar inputs: Level, Power, Attack/Sp. Atk, Defense/Sp. Def, STAB, type effectiveness, crit, random roll, Ability, active Held/Berry, status, weather and battle modifiers.

Positioning mostly controls whether/how an action connects rather than adding uncontrolled generic damage multipliers.

## Shared engine

Wild, Trainer, gym, story boss, dungeon, raid and PvP battles all use the same battle engine. Encounter data configures arena, deployment, capture policy, AI and victory conditions.
