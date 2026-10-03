# Python ROM asset extractor

This is the local extraction stage for Tactimon.

It does not upload the ROM and does not put extracted payloads in Git.

## Usage

Windows:

```powershell
py tools/asset-extractor/extract.py local-assets/roms/emerald.gba --clean
```

Linux/macOS:

```bash
python3 tools/asset-extractor/extract.py local-assets/roms/emerald.gba --clean
```

By default output is written to `local-assets/extracted/<game>/`.

## Current stage

The first extractor validates the supported Emerald/FireRed ROM hashes and decodes validated GBA LZ77 type 0x10 streams. Each decoded block is recorded in a manifest with its original ROM offset.

This intentionally separates raw ROM extraction from semantic mapping. Future modules can use known game pointer tables/specs to identify exactly which blocks are Pokémon sprites, palettes, tilesets, maps and UI assets without changing the local-only storage model.
