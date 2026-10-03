# Python ROM asset extractor

This directory contains the local-only ROM extraction and conversion pipeline for Tactimon.

Nothing is uploaded. ROMs, raw extracted blocks and generated PNG assets remain under `local-assets/`, which is ignored by Git.

## 1. Raw extraction

Windows:

```powershell
py tools/asset-extractor/extract.py local-assets/roms/emerald.gba --clean
```

Linux/macOS:

```bash
python3 tools/asset-extractor/extract.py local-assets/roms/emerald.gba --clean
```

Repeat for FireRed if desired.

The raw stage validates the supported ROM and decompresses valid GBA LZ77 streams into:

```text
local-assets/extracted/emerald/lz77/
local-assets/extracted/firered/lz77/
```

## 2. Convert raw blocks into assets

Emerald:

```bash
python tools/asset-extractor/convert.py local-assets/roms/emerald.gba
```

FireRed:

```bash
python tools/asset-extractor/convert.py local-assets/roms/firered.gba
```

Generated assets are written to:

```text
local-assets/extracted/<game>/assets/
├── asset-manifest.json
└── pokemon/
    ├── front/
    │   ├── normal/
    │   └── shiny/
    └── back/
        ├── normal/
        └── shiny/
```

The converter reads the ROM's pointer tables, finds the corresponding already-extracted LZ77 blocks, decodes GBA 4bpp graphics and BGR555 palettes, and writes transparent RGBA PNGs.

The current supported reference ROMs render all 440 Gen III internal species slots.

## Diagnostic raw previews

To render all plausible 4bpp blocks as PNG previews:

```bash
python tools/asset-extractor/convert.py local-assets/roms/firered.gba --raw-previews
```

These previews are useful for identifying tilesets, UI graphics and other compressed ROM resources before we add semantic table-specific extractors.

You can limit preview generation while testing:

```bash
python tools/asset-extractor/convert.py local-assets/roms/firered.gba --raw-previews --max-previews 100
```

## Next semantic extractors

The next stages will map FireRed/Emerald ROM tables into named local resources such as:

- tilesets and palettes
- overworld/player/NPC sprites
- map layouts and metatiles
- trainer graphics
- UI/icon graphics
- data tables needed by the game

Pokemon battle sprite extraction is implemented first as a verified end-to-end conversion path.
