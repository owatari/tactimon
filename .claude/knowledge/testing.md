# Testes

- Raiz: `pnpm test` = `vitest run tests && pnpm -r test` (engine).
- `tests/*.test.ts` importam diretamente `apps/client/lib/*` (funções puras). Um arquivo por feature/área de mapa (ex.: `route3.test.ts`, `whiteout.test.ts`, `story-persistence.test.ts`).
- Engine: `packages/battle-engine/test/*.test.ts` importam de `../src`.
- Direcionado:
  - `pnpm exec vitest run tests/whiteout.test.ts`
  - `pnpm --filter @tactimon/battle-engine exec vitest run test/spawn-placement.test.ts -t "6x10"`
- Typecheck: `pnpm --filter @tactimon/battle-engine typecheck`, `pnpm --filter @tactimon/client typecheck` (client typecheck cobre componentes React; não há testes de componente).
- Não há lint configurado. Build (`pnpm build`) depende de assets locais (sync) — só quando necessário.
- Componentes React não têm testes unitários: extraia a lógica para `lib/` e teste lá; valide UI por screenshot.
- Validação visual sem Chrome: `playwright-core` instalado no scratchpad + `channel: "msedge"` headless contra o dev server já rodando (porta 3000). Semear `localStorage` (`tactimon.story.v1` = `{version:2, story}`, `tactimon.position.v1`) e ler `.dialogue-panel`/`.location-chip` para asserts. Tamanhos: 1365×768 e 1792×851.
- `tests/world-reachability.test.ts` precisa dos assets sincronizados (`public/game-assets`); sem eles os testes são `skipIf`.

## Walkthrough (task 015)
- `tests/walkthrough.test.ts` (parte do `pnpm test`): uma história encadeada sobre a camada pura — novo jogo → inicial → Oak's Parcel/Pokédex → Mart → capturas/PC → evolução → trocas → Day Care → Game Corner → whiteout → 8 ginásios (6 mons) → gates/HMs → Campeão (estrela do cartão) → save/load → idiomas. Cada `it` é uma etapa numerada: a falha nomeia a etapa.
- `pnpm e2e:walkthrough` (fora do `pnpm test`): `tools/e2e/walkthrough.e2e.ts` + `vitest.config.ts`; precisa de `pnpm dev` rodando e Edge/Chrome (CDP, sem dependências). Semeia saves (`tactimon.story.v1`, `tactimon.position.v1`, `tactimon.lang.v1`) e verifica: boot de novo jogo, menu Start sem/ com Pokédex, canvas da Pokédex ROM, cartão (virar, estrelas), Summary → info de golpe, 15 mapas principais carregando sem exceções JS, idioma pt, estado de whiteout. `E2E_SCREENSHOTS=<dir>` salva PNGs (não versionar); `E2E_URL` muda o host.
- O navegador headless herda o idioma do SO: os testes fixam `tactimon.lang.v1`.

## Playthrough real acelerado (task 018)
- `pnpm e2e:playthrough` (fora do `pnpm test`; precisa de `pnpm dev` + Edge/Chrome): 8 ginásios → Elite Four → Campeão → Hall of Fame com **batalhas reais do client**, ~4,5 min. Falha nomeia a etapa; `E2E_RESUME=<etapa>` (ex.: `e4-lorelei`) continua de um checkpoint; `E2E_SCREENSHOTS=<dir>` salva PNGs.
- Modo turbo: `localStorage["tactimon.e2e.v1"]="1"` (só em `NODE_ENV !== "production"`, `lib/e2eMode.ts`): batalha em Auto a 40×; o driver chama `window.__tactimon_e2e.fightTrainer(id)` (hook em `OverworldGame`). Party do teste é nivelada por etapa (líder+8) e restaurada antes de cada luta — atalho documentado, o teste valida fluxo/batalhas, não grind.
- Armadilhas aprendidas: (1) lançar o Edge com `--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows` (senão os timers de 1–25 ms são estrangulados e a batalha "trava"); (2) **não** capturar screenshot nem enviar Enter durante a batalha (congela os timers/dispara comandos); (3) sair da página do jogo (`/robots.txt`) antes de semear o `localStorage`, pois o jogo salva ao descarregar; (4) não rodar duas execuções ao mesmo tempo; (5) telas pós-batalha fecham pelo botão (`.battle-results-overlay button`), registro de Pokédex por Enter.
- E2E com `requestAnimationFrame` (overworld, follower): o Edge headless pode deixar a aba `hidden` após várias navegações e o loop do jogo para; `launchBrowser` liga `setFocusEmulationEnabled` e o `load` chama `cdp.bringToFront()`.
