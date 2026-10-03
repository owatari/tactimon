# FireRed music extractor

Normal use is intentionally one step:

```bash
pnpm dev
```

If the required music files do not exist, the client predev script finds the supported FireRed ROM in `local-assets/roms/`, extracts the music, then starts the game. If extraction cannot run, development stops with the actual missing-tool error instead of opening the game with broken audio URLs.

The supported ROM SHA-1 is `41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc`.

The generated runtime tracks are:

- 291 — Route 1
- 297 — Trainer battle / current rival battle
- 298 — Wild battle
- 300 — Pallet Town
- 301 — Professor Oak's Lab
- 314 — Viridian/Pewter

Generated browser assets are written to:

```text
local-assets/extracted/firered/music/runtime/
```

The extraction backend currently requires GBA Mus Ripper, FluidSynth and FFmpeg. When `gba_mus_ripper` is not on `PATH`, set `TACTIMON_GBA_MUS_RIPPER` to its executable path.

To prepare only the music without starting Next.js:

```bash
pnpm music
```
