# Handoff 040
- Todo combate começa com `applyOpeningMovement(state, OPENING_TILES=1)` (cada Pokémon anda 1 tile grátis em direção ao inimigo, antes do round 1). Gap de vitória de quem age primeiro: −9 pp → −4 pp (mirror fights). `openingTiles: 0` devolve o spawn bruto.
- Testar: `pnpm --filter @tactimon/battle-engine exec vitest run test/first-mover.test.ts`; comparar variantes com `FM_SEEDS=300 FM_TILES=0,1,2`.
- Pendência: 1v1 espelhado fica decidido pela Speed (~93% para quem age primeiro); stalls "quiet" de até 72 passos sem dano já existiam no baseline.
