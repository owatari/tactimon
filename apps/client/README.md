# Tactimon client

Playable Kanto overworld slice using the extracted FireRed world assets and SpriteCollab Pokémon animations.

## Run

From the repository root:

```bash
pnpm install
pnpm dev
```

Before the first run, put a SpriteCollab checkout at either:

```text
local-assets/spritecollab/
```

or:

```text
local-assets/spritecollab/SpriteCollab/
```

For example:

```bash
git clone https://github.com/PMDCollab/SpriteCollab.git local-assets/spritecollab/SpriteCollab
```

The `predev` hook builds `apps/client/public/game-assets` from the versioned FireRed extraction plus the local SpriteCollab checkout.

## Current overworld slice

- Pallet Town, Route 1 and Viridian City
- Professor Oak's Lab
- smooth held-key four-direction movement
- FireRed collision/elevation data
- smooth camera follow
- FireRed foreground reconstruction for roofs/fences
- NPC/object placements from semantic world data
- door warp into/out of Oak's Lab
- keyboard and touch controls

## Semantic world data

Regenerate FireRed semantic map data when the extractor changes:

```bash
python tools/asset-extractor/convert_world.py local-assets/roms/firered.gba --maps
```

This exports NPC placements, warps, coordinate/background events and map connections under `maps/world/`.

## Oak Lab starter flow

1. enter Oak's Lab from Pallet Town;
2. interact with Oak or a starter ball;
3. choose Bulbasaur, Charmander or Squirtle;
4. Blue receives the classic counter starter;
5. approach the Lab exit;
6. start the first tactical duel;
7. after the duel, leave through the Lab door warp.

Starter/battle completion state is persisted in browser local storage for now.

## Tactical battle scene

The battle is driven by `@tactimon/battle-engine`.

For the current starter duel:

- arena size is derived from a 9×7 (or smaller) crop around the encounter location;
- the arena background is the actual FireRed map preview from that location;
- overworld collision and occupied object cells become blocked tactical cells;
- player and enemy Pokémon spawn on seeded-random valid cells;
- both spawns are kept in the same connected walkable region;
- Speed determines the first turn;
- each Pokémon starts a turn with 6 AP and 3 MP;
- movement is four-directional;
- distance is Manhattan;
- Tackle/Scratch cost 4 AP and range 1;
- Growl/Tail Whip cost 2 AP and range up to 3;
- rival AI uses the same movement/action rules.

Pokémon visuals come from SpriteCollab runtime assets. FireRed Pokémon battle sprites are not used.
