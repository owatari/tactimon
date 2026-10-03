# ROM reference tooling

This directory validates privately supplied reference ROMs. It intentionally contains no ROM images or extracted proprietary art/audio/maps/scripts.

Expected hashes are in `rom-sources.json`.

```bash
node tools/rom-data/verify-roms.mjs /path/to/emerald.gba /path/to/firered.gba
```

Future importers should emit narrowly scoped structured reference data rather than copying full ROM contents into Git.
