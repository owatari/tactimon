# Assets, ROM References and Attribution

## Asset model

ROM binaries stay local and are never committed. Generated semantic assets may be versioned in this project workflow, while large upstream checkouts such as SpriteCollab remain local inputs.

```text
local-assets/
  roms/          # local ROM binaries only
  extracted/     # generated assets/manifests
  spritecollab/  # local upstream checkout
```

## Supported ROMs

| Game | Code | Size | SHA-1 | Purpose |
| --- | --- | ---: | --- | --- |
| Pokémon Emerald | BPEE | 16777216 | f3ae088181bf583e55daf962a92bb46f4f1d07b7 | Gen III reference/data/assets |
| Pokémon FireRed | BPRE | 16777216 | 41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc | Kanto world/maps/NPC/UI |
| Pokémon Mystery Dungeon: Explorers of Sky (USA) | C2SE | 134217728 | 5fa96ca8d8dd6405d6cd2bad73ed68bc73a9d152 | tactical move/battle VFX source |

## FireRed/Emerald world assets

`convert_world.py` reads a supported local ROM and builds semantic assets such as overworld sheets, tiles/palettes, metatiles, map previews, events, warps and connections.

Pokémon battle sprites are intentionally not sourced from FireRed/Emerald.

## SpriteCollab

Upstream: https://github.com/PMDCollab/SpriteCollab

Tactimon uses a developer-local checkout under `local-assets/spritecollab/`. Runtime sheets for the Pokémon currently needed by the client are generated during `predev` / `prebuild`. Attribution/provenance must remain available for distributable builds.

## Explorers of Sky VFX

`tools/pmd-vfx-extractor/extract.py` reads the local USA Explorers of Sky ROM and extracts `EFFECT/effect.bin`, its 293 effect entries, and the overlay-10 animation tables required to map effect-animation IDs to archive entries.

Raw extraction is dependency-free. Optional PNG rendering uses an installed `skytemple-files` package and writes runtime sheets under `local-assets/extracted/pmd-eos/vfx/runtime/`.

The client consumes only the generated runtime VFX copies; the `.nds` itself is never shipped.
