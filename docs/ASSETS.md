# Assets, ROM References and Attribution

## Local-only asset model

Tactimon keeps ROM files and extracted proprietary assets on the user's/developer's machine. Git contains extraction/conversion code and metadata, not ROM binaries or generated proprietary asset payloads.

```text
local-assets/
  roms/
  extracted/
  spritecollab/
```

## Supported ROMs

| Game | Code | Size | SHA-1 |
| --- | --- | ---: | --- |
| Pokémon Emerald | BPEE | 16777216 | f3ae088181bf583e55daf962a92bb46f4f1d07b7 |
| Pokémon FireRed | BPRE | 16777216 | 41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc |

## Generated world assets

`convert_world.py` reads the user's local ROM and the raw LZ77 extraction to build semantic local assets:

- trainer battle sprites;
- player/NPC/object overworld sheets;
- tiles and palettes;
- metatile definitions and attributes;
- reconstructed metatile atlas previews.

Semantic naming/frame metadata is derived from the matching pret decomp sources but graphics bytes are read from the user's ROM.

Pokemon battle sprites are intentionally not generated in the normal world pipeline; Tactimon's Pokémon runtime art is planned around SpriteCollab.

## UI and miscellaneous graphics

Many UI/effect assets are not centralized in a single Gen III table. `--raw-previews` remains available as the discovery layer for unclassified compressed 4bpp graphics. Named UI extractors can be added progressively as specific screens become part of the client.

## SpriteCollab

Upstream: https://github.com/PMDCollab/SpriteCollab

A local checkout may live under `local-assets/spritecollab/`. Attribution/provenance must be retained for assets used in distributable builds.
