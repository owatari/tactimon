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
