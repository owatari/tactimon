# SpriteCollab importer

Upstream: https://github.com/PMDCollab/SpriteCollab

Tactimon uses SpriteCollab as the Pokémon animation source. The upstream checkout stays developer-local; runtime copies are produced under the generated client asset directory and are not committed.

## Local checkout

Either layout is accepted:

```text
local-assets/spritecollab/
  sprite/
  portrait/
  ...
```

or:

```text
local-assets/spritecollab/
  SpriteCollab/
    sprite/
    portrait/
    ...
```

Example:

```bash
git clone https://github.com/PMDCollab/SpriteCollab.git local-assets/spritecollab/SpriteCollab
```

## Runtime build

`apps/client/scripts/sync-assets.mjs` calls `build-runtime-assets.mjs` automatically during `predev` and `prebuild`.

For the current starter battle it imports:

- Bulbasaur: SpriteCollab id `0001`
- Charmander: SpriteCollab id `0004`
- Squirtle: SpriteCollab id `0007`
- Pidgey: SpriteCollab id `0016`
- Rattata: SpriteCollab id `0019`

The runtime importer reads each `AnimData.xml`, copies available `Idle`, `Walk`, `Attack`, `Hurt` and `Faint` sheets, and generates:

```text
apps/client/public/game-assets/pokemon-sprites/
  manifest.json
  bulbasaur/
  charmander/
  squirtle/
```

The manifest contains frame dimensions, frame durations and direction-row metadata so the client displays one animation frame at a time instead of rendering an entire sprite sheet.

`scan-spritecollab.mjs` remains useful for scanning the full upstream catalog.
