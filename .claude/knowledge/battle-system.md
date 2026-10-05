# Sistema de batalha

## Engine — `packages/battle-engine/src/duel.ts` (~7.8k linhas; use `rg -n`)
- Criação: `createWildDuel(WildDuelOptions)`, `createTrainerDuel`, `createStarterDuel`. Opções incluem `seed`, `width`, `height`, `blocked`, `players`, `wilds`/`rivals`.
- Spawn: `pickSpawnPositions` (anchors) → `pickTeamSpawnPositions` → `clusterSpawnPositions`. Helpers `connectedOpenCells`, `largestOpenRegion`, `openNeighborCount`. Regras: maior componente conectado, sem bloqueados, preferir áreas abertas/interior, times em lados opostos, anchors ~4–7 tiles.
- Ações: `applyDuelAction(state, action)` → `{accepted, state, presentation}`; AI: `resolveSimpleAiTurnDetailed`. Alcance: `getReachableCells`. Área: `getDuelMoveAreaTargetIds`.
- Turnos: iniciativa por Speed (`initiative.ts`, `orderByInitiative`). Unidades com `hp <= 0` são ignoradas para turno/alvo/ocupação.
- Captura: `getDuelCaptureEligibility`, `isDuelAutoCatchTarget` (`AUTO_CATCH_HP_RATIO`), `capture.ts`.
- Determinismo: `createSeededRandom(seed)`.

## Apresentação — `apps/client/components/FirstBattle.tsx`
- Estado `DuelState` local; anima resultados (`animateResolvedMove`, `animateResolvedItem`), `setUnitAnimation(id, "faint" | ...)`.
- Sprites: `PokemonBattleSprite.tsx` (manifest SpriteCollab runtime). VFX: `BattleVfx.tsx`. Portraits: `PokemonPortrait.tsx`.
- Fim: `onComplete(BattleOutcome)` com HP/status/PP por índice de party, `defeatedEnemies`, `capture`, `won`, `inventory`.
- Fim de batalha: `FirstBattle` chama `onComplete` sozinho ~650 ms após `status: finished` (sem painel interno).
- Pós-batalha (tela única): `GameClient.battleResult` → `BattleResultsScreen` (cabeçalho de `lib/battleResult.ts` `describeBattleResult` + prêmio + EXP/level/golpes por Pokémon) → `PokemonEvolutionOverlay` → `ProgressionOverlay` (golpes pendentes) → whiteout se aplicável.
- Faint: unidade HP 0 some em 260 ms (classe `.fainting` + timer em `FirstBattle`); a engine já a ignora para tile/turno/alvo.
- Arena: o client monta `BattleSceneContext` em `OverworldGame.tsx` (recorte do mapa; `blocked` = colisão, água via `isWaterCell`, fallback 17×9).

## Testes
`packages/battle-engine/test/` — `duel.test.ts` (grande, inclui "battle movement and deployment scale"), `spawn-placement.test.ts`, `capture.test.ts`, `progression.test.ts`, `pewter-gym.test.ts`. Status no client: `tests/*-status.test.ts`.
