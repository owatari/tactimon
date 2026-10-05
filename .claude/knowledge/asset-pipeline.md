# Pipeline de assets

Doc longo: `docs/ASSETS.md`. ROMs nunca são versionadas.

- `tools/asset-extractor/` (Python): `convert_world.py` extrai mapas/tiles/metatiles/eventos da ROM FireRed/Emerald para `local-assets/extracted/<game>/assets/` (manifests enormes — não abrir).
- `tools/sprite-importer/build-runtime-assets.mjs`: lê `AnimData.xml` + PNGs do checkout local SpriteCollab (`local-assets/spritecollab/`, gitignored) e gera `apps/client/public/game-assets/pokemon-sprites/` + `manifest.json` (species → animations {frameWidth, frameHeight, frames, durations, file, directionRows}).
- `apps/client/scripts/sync-assets.mjs` (roda em predev/prebuild): copia mapas/sprites para `public/game-assets/` (gitignored) e chama o sprite importer.
- `tools/pmd-vfx-extractor/`: VFX de PMD EoS. `tools/firered-music-extractor/` + `scripts/prepare-music.mjs`: música.
- Frames SpriteCollab têm canvas com muita transparência e tamanhos diferentes por animação/espécie. `sprite-metrics.mjs` (decoder PNG sem deps) grava `bounds` e `groundX/groundY` por animação no manifest; `audit-sprites.mjs` audita (ocupação, deriva do chão, saltos de tamanho).
- Nunca ler PNG/binário como texto: use scripts que imprimem métricas.
