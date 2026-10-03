# Tactimon Online

Tactimon Online is a non-commercial fan MMORPG prototype built around a persistent multiplayer world and Pokémon-style progression, with every battle resolved as a grid-based tactical encounter.

## Core pillars

- Persistent shared overworld inspired by the pacing of classic Pokémon/PokéMMO.
- Tactical, turn-based battles with 4-direction movement.
- Parties of up to 6 Pokémon deployed together in normal encounters.
- Pokémon fundamentals preserved: level, base stats, IVs, EVs, Nature, STAB, type effectiveness, critical hits, abilities, held items, berries and four moves.
- Moves are redesigned for a tactical grid: AP cost, range, AoE, line of sight, displacement, zones and terrain interactions.
- Speed primarily determines initiative rather than movement range.
- Wild encounters can contain many Pokémon at once.
- Dungeons are authored multiplayer exploration spaces with puzzles, static encounters and a boss room.
- Raids are direct 6-player boss encounters, one Pokémon per player.
- Horizontal itemization: content remains relevant because specific TMs and Held Items come from specific activities instead of item-level tiers.

## Repository layout

```text
apps/
  client/
  server/
packages/
  battle-engine/
  game-data/
  protocol/
  shared/
tools/
  asset-extractor/
  rom-data/
  sprite-importer/
local-assets/
  roms/          # put your local .gba files here
  extracted/     # generated ROM assets/data (ignored by Git)
  spritecollab/  # optional local SpriteCollab checkout/assets
docs/
```

The first implementation milestone is the deterministic battle engine.

## Local ROM asset workflow

ROMs and extracted proprietary assets stay on the developer/player machine and are never committed.

1. Put a supported ROM in `local-assets/roms/`.
2. Run:

```bash
python tools/asset-extractor/extract.py local-assets/roms/emerald.gba --clean
```

3. Generated data goes to `local-assets/extracted/emerald/` or `local-assets/extracted/firered/`.

The current extractor validates the ROM and decompresses validated GBA LZ77 streams while preserving ROM offsets and hashes in `manifest.json`. Game-specific mapping layers will progressively classify those streams into named sprites, tilesets, palettes, maps and other resources.

See `local-assets/README.md` and `docs/ASSETS.md`.

## Current reference ROMs

- Pokémon Emerald (BPEE): `f3ae088181bf583e55daf962a92bb46f4f1d07b7`
- Pokémon FireRed (BPRE): `41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc`

## License

Project code licensing is not chosen yet. Third-party names, characters, trademarks and assets remain the property of their respective owners.
