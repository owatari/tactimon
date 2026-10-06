# Plan — 2026-10-06-018-full-playthrough-e2e

## Objetivo
Playthrough E2E real (novo jogo → Campeão → Hall of Fame) dirigido por input/ações no client, **acelerado** para rodar em minutos, não horas. Complementa a 015 (que só semeia saves).

## Abordagem (acelerar sem perder cobertura)
- **Modo e2e/turbo** ativado por flag (`?e2e=1` ou `localStorage tactimon.e2e.v1`), só em dev: battle speed máx. (existe `battleSpeed`), animações/diálogos/transições/whiteout com duração ~0, passos instantâneos, RNG de batalha com `seed` fixa (engine já aceita `seed`).
- **Driver** em `tools/e2e/playthrough.e2e.ts` (CDP, como a 015): API de teste exposta pelo client (`window.__tactimon_e2e`: `teleport(mapId,x,y)`, `state()`, `advanceDialogue()`, `startBattle/autoBattle()`), para não andar tile a tile.
- **Auto-battle**: policy simples (melhor golpe super efetivo; troca/cura se necessário; Poké Ball no 1º wild) rodando no engine/UI com timers zerados.
- **Progressão por etapas encadeadas** (um save contínuo, nada semeado entre etapas): starter → rival → Parcel/Pokédex → capturas → 8 ginásios (6v6) → E4 → Champion → HoF; checkpoints de save após cada ginásio para retomar (`E2E_RESUME=<etapa>`).
- Nível: grind por XP concedido via helper de teste (limitado e registrado) ou seeds de party por etapa; decidir em decisions.md.
- Relatório por etapa + tempo; meta: < 15 min total.

## Acceptance criteria
- [ ] `pnpm e2e:playthrough` documentado em `.claude/knowledge/testing.md`; fora do `pnpm test`.
- [ ] Vence os 8 ginásios, E4 e Campeão **via batalhas reais** do client e chega ao Hall of Fame (estrela no Trainer Card).
- [ ] Modo turbo inexistente em produção (guard por flag/dev) e sem alterar comportamento normal.
- [ ] Execução completa < 15 min; falha nomeia a etapa e salva screenshot + save.
- [ ] Retomável por etapa (`E2E_RESUME`).
- [ ] Bugs achados: corrigidos ou viram tasks. Nada local versionado.

## Arquivos prováveis
`tools/e2e/playthrough.e2e.ts`, `tools/e2e/vitest.config.ts`, `apps/client/components/{GameClient,OverworldGame,FirstBattle}.tsx` (hook de teste/turbo), `apps/client/lib/e2eMode.ts` (novo), `package.json`, `.claude/knowledge/testing.md`.

## Riscos
Flakiness de timing em canvas; custo de manter o hook de teste; auto-battle ruim em ginásios difíceis (mitigar com party semeada/nível); E4 sem cura entre lutas (regra real); superfície de teste não pode vazar para prod.

## Testes necessários
Vitest para `e2eMode` e a policy de auto-battle (pura, em `lib/`); o E2E em si como verificação final com relatório.

## Commits
1. `feat: e2e turbo mode and test hooks` 2. `test: auto-battle policy` 3. `test: full playthrough e2e` 4. `docs: testing knowledge for playthrough`
