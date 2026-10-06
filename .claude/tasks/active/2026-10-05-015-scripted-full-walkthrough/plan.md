# Plan — 2026-10-05-015-scripted-full-walkthrough

## Objetivo
Lacuna 5 da 009: walk-through completo não foi feito. Criar script reproduzível (Playwright/Edge headless contra dev server + helpers vitest) que valida o jogo de novo jogo até a Liga/Champion: inicial, Oak/rival, gates (Route 22, Viridian Gym, Cut/Surf/Strength/Flash, Silph, Rocket, Safari, Cycling Road, Cerulean Cave), 8 ginásios (6v6), E4 + Champion, captura, evolução, whiteout, Day Care, trocas, Game Corner, Mart/PC, save/load/reset, troca de idioma.

## Abordagem
- Camada rápida (vitest, determinística): sequência de eventos via `lib/story.ts` (`chooseStarter`, flags de badge) verificando alcançabilidade de cada gate/warp (`world-reachability`).
- Camada E2E (`tools/e2e/`, fora do `pnpm test` padrão): saves semeados por estágio (0/2/4/8 badges, pós-Liga, party desmaiada, party cheia + box) + inputs scriptados; screenshots por etapa em scratchpad (não versionar).
- Relatório em verification.md: etapa → OK/bug; bugs viram correções pequenas ou novas `/new-task`.

## Acceptance criteria
- [ ] Script `pnpm e2e:walkthrough` (ou equivalente) documentado em `.claude/knowledge/testing.md`.
- [ ] Cobre todas as etapas acima; falha com mensagem clara na etapa quebrada.
- [ ] Executado inteiro ao menos uma vez; relatório com resultado por etapa.
- [ ] Bugs encontrados: corrigidos (pequenos) ou registrados como tasks.
- [ ] Nada local versionado (screenshots, `.tmp_*`).

## Arquivos prováveis
`tools/e2e/*` (novo), `tests/world-reachability.test.ts`, `tests/helpers/`, `package.json` (script), `.claude/knowledge/testing.md`.

## Riscos
Flakiness de timing em canvas; custo de tempo; Edge headless no Windows; RNG de batalha (usar seeds determinísticas). Recomendado rodar após 010–014 para validar o conjunto.

## Commits
1. `test: scripted walkthrough harness` 2. `fix: ...` por bug 3. `docs: testing knowledge for e2e walkthrough`
