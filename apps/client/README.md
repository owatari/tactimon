# Tactimon client

Playable Kanto overworld slice using extracted FireRed world assets, SpriteCollab Pokémon animation sheets, and optional Explorers of Sky battle VFX.

## Run

From the repository root:

```bash
pnpm install
pnpm dev
```

Before the first run, put a SpriteCollab checkout at either `local-assets/spritecollab/` or `local-assets/spritecollab/SpriteCollab/`.

Example:

```bash
git clone https://github.com/PMDCollab/SpriteCollab.git local-assets/spritecollab/SpriteCollab
```

The `predev` hook builds `apps/client/public/game-assets` from the FireRed extraction, local SpriteCollab checkout, and (when present) rendered Mystery Dungeon VFX.

## Current overworld slice

- Pallet Town, Route 1 and Viridian City;
- Professor Oak's Lab;
- smooth held-key four-direction movement;
- FireRed collision/elevation data;
- smooth camera follow;
- FireRed foreground reconstruction for roofs/fences;
- NPC/object placements from semantic world data;
- door warp into/out of Oak's Lab;
- keyboard and touch controls.

## Semantic world data

Regenerate FireRed semantic map data when the extractor changes:

```bash
python tools/asset-extractor/convert_world.py local-assets/roms/firered.gba --maps
```

## Oak Lab starter flow

The first story slice covers Lab entry, starter choice, Blue's counter starter, the rival trigger near the exit, the first tactical battle, and the Lab exit warp.

Starter/battle completion state is persisted in browser local storage for now.

## Tactical battle HUD

The battle is driven by `@tactimon/battle-engine`.

The player's command flow is now explicit:

```text
Andar -> escolher tile
Move  -> escolher golpe -> escolher alvo
Item  -> escolher item  -> escolher aliado
Fugir -> validar se o encontro permite fuga
```

A compact `Encerrar turno` action remains available because AP/MP can support several actions in one turn.

Current tutorial rules:

- arena is a crop of the actual map where combat started;
- overworld collision/object cells become tactical obstacles;
- Pokémon spawn on seeded-random valid connected cells;
- 6 AP and 3 MP per turn;
- four-direction movement / Manhattan distance;
- one Potion is available in the tutorial battle;
- trainer battles reject fleeing;
- rival AI uses the same engine actions.

## Battle animation layers

The battle renderer separates:

1. map crop;
2. tactical grid;
3. animated Pokémon units;
4. move VFX;
5. HUD/target selection.

Pokémon sprites come from SpriteCollab. Unit states can switch through `Idle`, `Walk`, `Attack`, `Hurt`, and `Faint`.

Move VFX are optionally extracted from Pokémon Mystery Dungeon: Explorers of Sky. See `tools/pmd-vfx-extractor/README.md`. If rendered runtime VFX are not present, CSS fallback effects are used.


## Compact battle HUD

Battle commands are contextual instead of occupying a large bottom panel. On the player's turn a small list opens above the active Pokémon:

```text
Move   -> choose a reachable tile
Attack -> choose a move -> choose a target
Item   -> choose an item -> choose an ally
Run    -> ask the battle engine to escape
```

Every submenu contains a Back action. The persistent HUD is limited to compact player/rival cards with SpriteCollab portraits, HP, AP, MP and visible stat-stage buffs/debuffs.


## Route 1 wild encounters and progression

After the Oak/Blue tutorial battle, walking through FireRed's Route 1 tall-grass metatile can roll a wild encounter using FireRed's 21% land encounter rate and slot weights.

Current Route 1 table:

- Pidgey, level 2–5;
- Rattata, level 2–4.

The tactical arena is still generated from the local Route 1 map crop and collision. Wild battles allow `Run`.

Winning a wild battle uses FireRed's Generation III flat EXP calculation. Pidgey uses base EXP 55 and Rattata 57; all three starters currently use FireRed's Medium Slow cumulative growth curve. Level-ups award the Tactimon EV budget and can teach moves from the current starter learnset. When a fifth active move would be learned, the post-battle UI asks which one existing move should be replaced, or allows declining the new move. It does not provide arbitrary move-loadout editing; that belongs to the future Move Tutor.


### Battle information HUD

Battles open as a full-screen stage so combat information no longer gets squeezed out by the overworld page chrome. A dedicated strip above the arena always shows both Pokémon with:

- SpriteCollab portrait;
- level and type;
- current/max HP and HP bar;
- player EXP progress to the next level;
- AP and MP;
- visible stat-stage buffs/debuffs, or NORMAL when none are active.

The contextual Move / Attack / Item / Run popup remains anchored to the active player Pokémon and does not replace the information HUD.
