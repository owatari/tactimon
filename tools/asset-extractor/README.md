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
├── ui/
│   └── items/
├── maps/
│   └── layouts/
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

### Maps

Named map layouts are exported under `maps/layouts/`. Each usable layout receives:

- `map.bin` with the original packed map cells;
- `layout.json` with decoded metatile/collision/elevation values;
- `preview.png` reconstructed from the extracted primary + secondary tilesets;
- `border.bin` when the layout stores explicit border dimensions.

FireRed's layout table includes intentional empty/unused slots; those remain represented in the manifest instead of being silently renumbered.

### UI

The first semantic UI extractor exports every item icon (including balls, berries, Held Items, TMs/HMs and key items) as a named transparent 24×24 PNG under `ui/items/`.

Screen-specific UI graphics are still discovered progressively; use `--raw-previews` when we need to classify additional compressed interface assets.

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
python tools/asset-extractor/convert_world.py local-assets/roms/firered.gba --maps
python tools/asset-extractor/convert_world.py local-assets/roms/firered.gba --ui
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


### World map data

The map pass also reads the compiled `MapHeader` / `MapEvents` structures from the supported ROM and exports:

- map group + map number + semantic map name;
- layout association;
- object/NPC placements and graphics ids;
- warp destinations;
- coordinate events;
- background events;
- north/south/east/west map connections with offsets.

Generated files are written under:

```text
local-assets/extracted/<game>/assets/maps/world/
  188_pallettown/world.json
  189_viridiancity/world.json
  207_route1/world.json
  ...
```

This is the data layer the MMO client/server should consume for world topology and initial NPC placement. Script bytecode is not interpreted yet; script pointers are preserved as ROM offsets for the later quest/dialogue importer.
