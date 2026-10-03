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
  rom-data/
  sprite-importer/
docs/
```

The first implementation milestone is the deterministic battle engine.

## Asset and ROM policy

The repository does **not** contain Game Boy Advance ROM images or proprietary assets extracted from them. Development tools may read legally supplied local ROM files to validate reference data, but generated proprietary graphics, audio, maps, scripts and ROM binaries stay outside version control.

Pokémon Mystery Dungeon-style sprite work is planned around PMDCollab/SpriteCollab. That repository includes community contributions under CC BY-NC 4.0 as well as material with additional upstream rights considerations. Import tooling and attribution metadata belong here; blindly vendoring the entire asset repository does not.

See `docs/ASSETS.md`.

## Current reference ROMs

The development copies supplied for reference match these SHA-1 hashes:

- Pokémon Emerald (BPEE): `f3ae088181bf583e55daf962a92bb46f4f1d07b7`
- Pokémon FireRed (BPRE): `41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc`

The ROM files themselves are intentionally ignored.

## License

Project code licensing is not chosen yet. Third-party names, characters, trademarks and assets remain the property of their respective owners.
