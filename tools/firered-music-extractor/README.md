# FireRed music extractor

This developer-local pipeline converts music from a supported Pokémon FireRed ROM into browser-ready Ogg Vorbis assets. The browser never reads the ROM directly and the ROM must not be committed.

## Requirements

- Pokémon FireRed ROM with SHA-1 `41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc`;
- GBA Mus Ripper (berg8793 fork), compiled or available as executables;
- FluidSynth;
- FFmpeg with `libvorbis`.

The helper creates a temporary compatibility shim because the upstream ripper calls companion binaries using Windows-style names even when compiled on Linux.

## Generate the tracks currently used by Tactimon

```bash
python tools/firered-music-extractor/extract.py \
  local-assets/roms/pokemon-firered.gba \
  --ripper /path/to/gba-mus-ripper/out/gba_mus_ripper

pnpm --filter @tactimon/client predev
```

The ripper produces `songNNNN.mid` files. Tactimon renders the FireRed song IDs currently needed by the playable slice:

- 291 — Route 1;
- 297 — Trainer battle (also used by the current rival battle);
- 298 — Wild battle;
- 300 — Pallet Town;
- 301 — Professor Oak's Lab;
- 314 — Viridian/Pewter city theme.

Use `--all` to render every ripped song. Use `--skip-rip` to rerender an existing `ripped/` directory without invoking GBA Mus Ripper again.

Generated files stay under `local-assets/extracted/firered/music/`. `apps/client/scripts/sync-assets.mjs` copies only the runtime output into the client's public game-assets directory. When the runtime manifest is missing, `predev` / `prebuild` scans `local-assets/roms/` for a FireRed ROM and attempts this extraction automatically. Set `TACTIMON_GBA_MUS_RIPPER` when the ripper executable is not on `PATH`.
