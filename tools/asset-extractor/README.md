# Local ROM asset pipeline

This directory converts user-owned FireRed/Emerald ROM data into local Tactimon assets.

Nothing generated under `local-assets/` is committed.

## 1. Raw LZ77 extraction

```bash
python tools/asset-extractor/extract.py local-assets/roms/firered.gba --clean
python tools/asset-extractor/extract.py local-assets/roms/emerald.gba --clean
```

## 2. World asset conversion

The world converter is now the default asset path for Tactimon:

```bash
python tools/asset-extractor/convert_world.py local-assets/roms/firered.gba
```

or:

```bash
python tools/asset-extractor/convert_world.py local-assets/roms/emerald.gba
```

Without category flags it generates:

```text
local-assets/extracted/<game>/assets/
├── world-asset-manifest.json
├── trainers/
│   └── front/
├── overworld/
└── tilesets/
    ├── 00_general/
    │   ├── tiles.4bpp
    │   ├── palettes.gbapal
    │   ├── palettes.png
    │   ├── metatiles.bin
    │   ├── attributes.bin
    │   └── metatiles_with_general.png
    └── ...
```

### Trainers

Trainer battle sprites are extracted from the ROM's compressed trainer tables and rendered as transparent 64×64 PNGs with semantic names.

### Overworld

Player/NPC/object graphics are read from `ObjectEventGraphicsInfo`. Frame dimensions, palettes and exact frame counts come from ROM structures plus metadata generated from the matching pret decomp source.

Each output PNG is a sprite sheet and the manifest records frame dimensions/count and source offsets.

### Tilesets

For every primary/secondary tileset the converter exports:

- decompressed 4bpp tile graphics;
- raw 16-palette set;
- palette preview PNG;
- metatile definitions;
- metatile attributes;
- reconstructed 16×16 metatile atlas PNG.

Secondary tilesets are paired with primary tilesets based on the layouts in the original game data. For example, FireRed PalletTown is rendered with General, while indoor secondary tilesets are commonly paired with Building.

## Optional categories

Generate only one category:

```bash
python tools/asset-extractor/convert_world.py local-assets/roms/firered.gba --trainers
python tools/asset-extractor/convert_world.py local-assets/roms/firered.gba --overworld
python tools/asset-extractor/convert_world.py local-assets/roms/firered.gba --tilesets
```

Pokemon battle sprites are not part of the default Tactimon pipeline. They remain available only as an explicit diagnostic/legacy option:

```bash
python tools/asset-extractor/convert_world.py local-assets/roms/firered.gba --pokemon
```

Miscellaneous compressed 4bpp candidates can still be previewed for UI/effect discovery:

```bash
python tools/asset-extractor/convert_world.py local-assets/roms/firered.gba --raw-previews
```

## Metadata

`rom-assets-gen3.json` contains semantic names/frame counts and tileset pairings derived from the matching pret FireRed/Emerald decomp projects. It contains no ROM payload.
