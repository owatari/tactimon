# FireRed music extractor

Normal use is one command:

```bash
pnpm dev
```

If the music is missing, Tactimon finds the supported FireRed ROM in `local-assets/roms/`, reads the ROM's MP2K/Sappy song table and instruments, and renders the tracks directly to 32.768 kHz WAV before Next.js starts.

There is no GBA Mus Ripper, FluidSynth or FFmpeg dependency. The extractor is `tools/firered-music-extractor/extract.py` and uses only the Python standard library.

Supported FireRed SHA-1:

```text
41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc
```

The runtime tracks currently generated are 291 (Route 1), 297 (trainer/rival battle), 298 (wild battle), 300 (Pallet Town), 301 (Professor Oak's Lab), and 314 (Viridian/Pewter). They are written to:

```text
local-assets/extracted/firered/music/runtime/
```

To run only the extraction:

```bash
pnpm music
```

The generated WAV files are local build artifacts and are not committed.


The v2 renderer follows FireRed's MP2K behavior more closely: PCM ADSR is stepped at the GBA engine frame rate, fixed-frequency samples keep the original 13.379 kHz playback rate, track pan/volume use MP2K scaling, and PSG square/wave/noise channels use hardware-style duty, wavetable and LFSR behavior. The manifest carries the extractor version so `pnpm dev` automatically replaces older v1 WAVs.
