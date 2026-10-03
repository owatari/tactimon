# Tactimon client

Playable Kanto overworld slice using the extracted FireRed assets committed under `local-assets/extracted/`.

## Run

From the repository root:

```bash
pnpm install
pnpm dev
```

The `predev` hook copies only the assets required by the current client into `apps/client/public/game-assets`. That directory is a generated runtime copy and remains ignored by Git.

## Current slice

- Pallet Town, Route 1 and Viridian City
- edge transitions between those three maps
- held-key continuous grid movement
- smooth per-tile interpolation
- alternating walking frames
- smooth camera follow with edge clamping
- four-direction collision from decoded map cells
- FireRed top-BG reconstruction for real roof/fence occlusion
- keyboard controls
- touch hold-to-walk d-pad

### Rendering layers

The committed `preview.png` stays as the base map. At runtime the client reads the extracted FireRed `tiles.4bpp`, `palettes.gbapal`, `metatiles.bin` and `attributes.bin` files and reconstructs a transparent foreground canvas.

FireRed's metatile layer rules are respected:

- NORMAL: top layer above players/NPCs
- SPLIT: top layer above players/NPCs
- COVERED: second layer remains below players/NPCs

This means roofs, fences and other upper tiles occlude the trainer independently from collision.

## Next world work

The world engine now has the map-transition seam needed to replace the temporary hand-authored Pallet/Route 1/Viridian edge rules with ROM-extracted `MapConnections`. The next data layer is NPC/object events, warps, coord events and background events.


## Semantic world data

After pulling the latest extractor changes, regenerate the FireRed map data once:

```bash
python tools/asset-extractor/convert_world.py local-assets/roms/firered.gba --maps
```

When `maps/world/*/world.json` is present, the client also loads:

- NPC/object placements from the ROM;
- NPC collision;
- basic interaction targeting with `E`, Space or Enter;
- warp/connection metadata for the next transition pass.

NPCs whose original ROM flag is non-zero are intentionally hidden for now until story flags are implemented.


## Oak Lab starter flow

The first playable story slice now includes:

1. walk to the laboratory door at Pallet Town;
2. enter the real extracted `PalletTown_ProfessorOaksLab` map through a door warp;
3. interact with Oak or one of the starter balls using `E`, Space or Enter;
4. choose Bulbasaur, Charmander or Squirtle;
5. Blue receives the classic counter starter;
6. walk toward the laboratory exit;
7. the original exit-row trigger starts the first tactical duel;
8. win or lose, the tutorial story continues and the laboratory exit warp is enabled.

Starter/battle completion state is persisted in browser local storage for now.

## First tactical battle

The tutorial battle is powered by `@tactimon/battle-engine`, not by UI-only combat code.

Current rules in the prototype:

- 7×5 grid;
- one Pokémon per side;
- Speed determines the first turn;
- 6 AP and 3 MP per turn;
- movement is four-directional;
- distance is Manhattan;
- Tackle/Scratch cost 4 AP and have range 1;
- Growl/Tail Whip cost 2 AP and have range up to 3;
- deterministic damage for reproducible tests;
- simple deterministic rival AI;
- the UI sends actions into the engine and renders the resulting state.

Battle Pokémon use abstract tactical tokens for now. FireRed battle sprites are intentionally not used; the visual layer can later be replaced by the SpriteCollab animation pipeline without changing battle rules.
