# Tactimon client

First playable overworld slice.

## Run

From the repository root:

```bash
pnpm install
pnpm dev
```

The `predev` hook copies the small set of FireRed-derived source assets needed by the current client from `local-assets/extracted/firered/assets` into `apps/client/public/game-assets`.

The canonical extracted assets remain under `local-assets/extracted`. The public directory is only a build/runtime copy.

## Current slice

- Pallet Town preview rendered from extracted metatiles
- Red overworld sprite sheet
- four-direction grid movement
- collision from decoded map cells
- camera following the player
- keyboard and on-screen controls
- collision debug overlay

Route 1 and Viridian assets are already synced for the next world-transition step.
