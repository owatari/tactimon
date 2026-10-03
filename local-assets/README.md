# Local assets

This directory contains local source inputs and generated FireRed/Emerald assets used by Tactimon.

## Folders

- `roms/`: local supported FireRed/Emerald `.gba` files. ROM binaries are never committed.
- `extracted/`: generated semantic/raw assets from the ROM extractor. In the current project workflow these generated assets may be versioned.
- `spritecollab/`: developer-local checkout of PMDCollab/SpriteCollab. The checkout itself is not committed; the client copies only required runtime sheets into its generated public asset directory.

## ROM extraction

```bash
python tools/asset-extractor/extract.py local-assets/roms/emerald.gba --clean
python tools/asset-extractor/convert_world.py local-assets/roms/firered.gba --maps
```

## SpriteCollab checkout

```bash
git clone https://github.com/PMDCollab/SpriteCollab.git local-assets/spritecollab/SpriteCollab
```

Then `pnpm dev` automatically prepares the required starter animations.
