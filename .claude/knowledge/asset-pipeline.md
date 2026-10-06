# Pipeline de assets

Doc longo: `docs/ASSETS.md`. ROMs nunca são versionadas.

- `tools/asset-extractor/` (Python): `convert_world.py` extrai mapas/tiles/metatiles/eventos da ROM FireRed/Emerald para `local-assets/extracted/<game>/assets/` (manifests enormes — não abrir).
- `tools/sprite-importer/build-runtime-assets.mjs`: lê `AnimData.xml` + PNGs do checkout local SpriteCollab (`local-assets/spritecollab/`, gitignored) e gera `apps/client/public/game-assets/pokemon-sprites/` + `manifest.json` (species → animations {frameWidth, frameHeight, frames, durations, file, directionRows}).
- `apps/client/scripts/sync-assets.mjs` (roda em predev/prebuild): copia mapas/sprites para `public/game-assets/` (gitignored) e chama o sprite importer.
- `tools/pmd-vfx-extractor/`: VFX de PMD EoS. `tools/firered-music-extractor/` + `scripts/prepare-music.mjs`: música.
- Frames SpriteCollab têm canvas com muita transparência e tamanhos diferentes por animação/espécie. `sprite-metrics.mjs` (decoder PNG sem deps) grava `bounds` e `groundX/groundY` por animação no manifest; `audit-sprites.mjs` audita (ocupação, deriva do chão, saltos de tamanho).
- Nunca ler PNG/binário como texto: use scripts que imprimem métricas.
- Layout dos sprites de batalha (`lib/spriteLayout.ts`): a escala vem do corpo visível do idle e **nunca** deixa o corpo mais largo que 1 tile (`SPRITE_MAX_WIDTH_TILES`) nem mais alto que 1,4 (`SPRITE_MAX_HEIGHT_TILES`); âncora no ponto de chão (`SPRITE_GROUND_Y`). Cada unidade ocupa 1 tile (engine garante posições únicas: `unique-positions.test.ts`); sombra neutra em `.duel-unit::after`. Rótulos alternam acima/abaixo (xadrez) para legibilidade.
