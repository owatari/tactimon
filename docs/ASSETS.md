# Assets, ROM References and Attribution

## Local-only asset model

Tactimon keeps ROM files and extracted proprietary assets on the user's/developer's machine.

The repository contains extraction/import code and metadata, not ROM binaries or the generated proprietary asset payloads.

Local layout:

```text
local-assets/
  roms/
  extracted/
  spritecollab/
```

All payload files inside those three directories are ignored by Git; only placeholder files/documentation are versioned.

## Reference ROMs

| Game | Header | Code | Size | SHA-1 |
| --- | --- | --- | ---: | --- |
| Pokémon Emerald | POKEMON EMER | BPEE | 16777216 | f3ae088181bf583e55daf962a92bb46f4f1d07b7 |
| Pokémon FireRed | POKEMON FIRE | BPRE | 16777216 | 41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc |

Run:

```bash
python tools/asset-extractor/extract.py local-assets/roms/emerald.gba --clean
```

The extractor currently:

- validates the SHA-1 and GBA header;
- creates a per-game local extraction directory;
- scans and validates BIOS/GBA LZ77 type `0x10` streams;
- decompresses each valid stream locally;
- records source ROM offsets, compressed/decompressed sizes and hashes in a manifest.

This gives us a reliable local raw-asset layer. Game-specific extraction specs can then map known ROM tables/pointers into semantic resources such as Pokémon graphics, tilesets, palettes and maps.

## SpriteCollab

Upstream: https://github.com/PMDCollab/SpriteCollab

A local checkout or locally extracted SpriteCollab payload may be placed under `local-assets/spritecollab/`.

Its submission policy describes community submissions under CC BY-NC 4.0 with attribution and separately calls out official Chunsoft-made material. Import must retain author/provenance metadata and generate attribution information. Useful upstream credit files include `credit_names.txt` and `spritebot_credits.txt`.

Gameplay movement uses North/East/South/West only; diagonal movement frames are not required for rules.
