# Plan — 034 URGENTE: golpes no level up
## Estado atual (investigado)
- Engine OK em isolamento: `grantExperience` (`packages/battle-engine/src/progression.ts` ~1100-1180) chama `movesLearnedAtLevel` e preenche `autoLearnedMoves` (< 4 golpes) ou `pendingMoves` (4 cheios). Teste rápido com Rare Candy: Charmander 5→25 aprendeu Ember (7) e Metal Claw (9); Flame Burst (11) ficou pendente.
- Logo o defeito está no **caminho do client**: `GameClient.handleBattleComplete` (rewards, `progressionQueueFor`, `rewardPartyIndices` — alterado na task 031 para pular Pokémon que chegaram caídos), `ProgressionOverlay.tsx`, `BattleResultsScreen.tsx`, aplicação do `reward.progression` ao story. **Suspeito nº 1: a task 031** (mapeamento `partyIndices` ↔ `outcome` mudou; recompensas podem estar associadas ao índice errado ou descartadas). Suspeito 2: fila de `pendingMoves` (escolha de substituir golpe) não aparece/resolve. Suspeito 3: golpes aprendidos não persistem no save (`normalizePokemonProgression`).
## Objetivo
Reproduzir, achar a causa raiz, corrigir e blindar com testes de ponta a ponta (batalha → XP → level up → golpe novo no Pokémon salvo; 4 golpes → pergunta de substituir).
## Acceptance
- [ ] Teste de regressão que falha hoje: simular `handleBattleComplete`/lib equivalente com party mista (incluindo membro caído e capturas) e verificar `activeMoves` atualizados no story salvo.
- [ ] Level up com < 4 golpes: aprende automaticamente e mostra na tela de progressão; com 4: aparece a escolha (aprender/pular) e persiste.
- [ ] Vale para líder, party[1..5], captura (XP ×1,2) e Rare Candy; vários níveis de uma vez.
- [ ] E2E (walkthrough) cobre: batalha curta → level up → golpe novo no Summary.
- [ ] `pnpm test`, typechecks, walkthrough e playthrough verdes; knowledge atualizado.
## Arquivos prováveis
apps/client/components/GameClient.tsx, ProgressionOverlay.tsx, BattleResultsScreen.tsx, lib/story.ts, packages/battle-engine/src/progression.ts, tests/, tools/e2e/walkthrough.e2e.ts.
## Riscos
Causa pode estar em mais de um ponto; reproduzir com bisect (ou revert local da 031) antes de editar.
## Ordem de commits
1. `test: reproduce missing level-up moves` 2. `fix: <causa>` 3. `docs`
