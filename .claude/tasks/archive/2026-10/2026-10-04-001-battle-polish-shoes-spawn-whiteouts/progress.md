# Progresso

## 2026-10-04 — planejamento
- Baseline (working tree com trabalho local): typechecks ✓; `vitest tests` 45 files/219 ✓; engine 1 falha (`duel.test.ts` deployment scale: expected 8 > 8.5).
- duel.ts local compila; patch `anchorOnRight/centerX/aWrongSide/bWrongSide` foi declarado mas **não usado** no comparator de `clusterSpawnPositions`.
- Candidato forte para F: `respawnRequest` nunca é limpo em `GameClient`; efeito em `OverworldGame` (`[loadMap, respawnRequest]`) reaplica `loadMap` em remount/Fast Refresh. Também `onOverworldStep` envia snapshot inteiro de `storyRef` (`setStory(nextStory)`).
- E: `handleBattleComplete` (trainer sem `trainerId` = tutorial) marca `firstBattleComplete` e aplica HP 0 → efeito de whiteout leva ao heal location.
Próximo: A2 (spawn) → A1 → E → F → D → B → C.

## checkpoint — A concluído
- [x] A2 spawn — duel.ts (openAreaScore, pickBestScored, cluster score com lado/dead-end), maps.ts (água surf-only 0x10–0x15), testes — `438b1acb`. Engine 198 ✓ (teste antigo deployment scale intacto).
- [x] A1 Running Shoes — story.ts (`shouldGrantRunningShoes`), OverworldGame (efeito entrega, R sem Ctrl), CSS HUD — `27b6d0a8`.
Próximo: E (tutorial Blue) + F (respawnRequest consumido uma vez; onOverworldStep funcional).

## checkpoint — E/F concluídos
- [x] F — causa: `respawnRequest` nunca limpo + efeito `[loadMap, respawnRequest]` reaplicado (Fast Refresh/remount). Fix: `shouldApplyRespawnRequest` + `appliedRespawnIdRef` + `onRespawnApplied` limpa no GameClient; `onOverworldStep(snapshot)` → `onStoryUpdate(updater)`; `shouldStartStoryWhiteOut` puro — `8d28abf0`. Teste `tests/respawn-request.test.ts`.
- Matriz verificada: único caminho para mapa de Pokémon Center fora de warp = `resolveWhiteOutRespawn` via `respawnRequest`. `loadMap` com célula bloqueada cai em `definition.spawn` (não é Center). Índices de `playerHp` alinhados (engine não reordena `units`). Save backup só vence por score maior (whiteout não altera score).
- [x] E — `completeTutorialRivalBattle` (cura HP/PP/status, `firstBattleComplete`) usado no trainer sem `trainerId` — `00fcade6`. Teste `tests/tutorial-rival-battle.test.ts`.
Próximo: D (faint delay) → B (sprites) → C (pós-batalha).

## checkpoint — D/B concluídos
- [x] D faint — `5f6333aa` + `4b869a01`: unidade HP 0 some com vanish 260ms (÷ speed) via timer; antes esperava a animação PMD Faint inteira (`onAnimationComplete`). Engine já ignorava HP 0 (teste `fainted-units.test.ts`).
- [x] B sprites — `cb0b7a81`: causa = escala pelo canvas idle + âncora pela base do canvas; PMD ground = centro do frame + ~4px. Importer mede bounds/ground (`sprite-metrics.mjs`), `lib/spriteLayout.ts`, auditoria `audit-sprites.mjs` (47 espécies, só magnemite com canvas 27% — ok). Grid visual idle/walk/attack/hurt inspecionado (rota temporária `app/sprite-audit`, NÃO commitar, remover no fim).
Próximo: C (pós-batalha unificado).

## checkpoint — C concluído, task fechada
- [x] C pós-batalha — `5dc224a0`: `BattleResultsScreen` único (GameClient) + `lib/battleResult.ts`; FirstBattle encerra sozinho após 650 ms; evolução depois do resumo; CSS morto `.battle-result*`/`.battle-summary*` removido.
- [x] HUD WALK/RUN posicionado e clicável — `b0899064`.
- Verifier (general-purpose com papel verifier): sem regressões. Achado "RUN não restaura após reload" descartado — OverworldGame só monta após hidratação; medido `mode0=RUN` após reload.
- Push: origin/main = b0899064. Rotas temporárias removidas.
