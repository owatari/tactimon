# Arquitetura

Monorepo pnpm (`pnpm-workspace.yaml`): `apps/*`, `packages/*`. `docs/ARCHITECTURE.md` descreve a visão alvo (servidor autoritativo) — **hoje** tudo roda no client com estado local.

## Pacotes
- `packages/battle-engine` (exporta `src/index.ts`): engine pura/determinística.
  - `duel.ts` — tipos `DuelState/DuelUnit/DuelAction`, `createWildDuel/createTrainerDuel/createStarterDuel`, `applyDuelAction`, AI (`resolveSimpleAiTurnDetailed`), spawn (`pickSpawnPositions`, `pickTeamSpawnPositions`, `clusterSpawnPositions`), movimento (`getReachableCells`), dano/tipos/status/PP.
  - `progression.ts` — XP (curvas FireRed), learnsets, EVs, evolução, `grant*ProgressToParty`.
  - `capture.ts` — elegibilidade/chance de captura.
- `packages/game-data` — schema (pouco usado).

## Client (`apps/client`)
- `app/page.tsx` → `components/GameClient.tsx` (estado raiz).
- `GameClient.tsx` — dono do `StoryState` (`useState`), persistência em localStorage, sessão de batalha (`battleSession`), recompensas (`handleBattleComplete`), whiteout (efeito + `pendingWhiteOut` → `respawnRequest`), overlays (Mart, Storage, BlackoutOverlay, BattleProgressionSummary, ProgressionOverlay).
- `OverworldGame.tsx` — loop canvas (RAF), movimento por tile, input, warps/transições (`loadMap`), triggers de trainers/rivais/eventos, diálogos, HUD. Mantém `storyRef` espelhando o prop `story`; reporta mudanças via `onOverworldStep`.
- `FirstBattle.tsx` — UI de batalha tática completa (todas as batalhas, apesar do nome): grid, turnos, animações, VFX, Auto Battle/Catch, tela de resultado. Chama `onComplete(BattleOutcome)`.
- `lib/` — lógica pura testável: `story.ts` (StoryState), `storyPersistence.ts`, `maps.ts` (WORLD_MAPS, transições, `resolveWhiteOutRespawn`), `trainers.ts`, `wildEncounters.ts`, `dialogueSystem.ts`, `playerWorld*.ts`, `scriptedWorldObjects.ts`, `mart.ts`, `music.ts`.
- `scripts/sync-assets.mjs` (predev/prebuild) copia assets extraídos para `public/game-assets/` (gitignored) e gera sprites via `tools/sprite-importer`.

## Fluxo de batalha
OverworldGame detecta encounter/trainer → callback → GameClient cria `battleSession` (party com HP>0 + `partyIndices`) → `<FirstBattle>` overlay (`paused`) → `onComplete(outcome)` → `handleBattleComplete` aplica HP/PP/status, XP, captura, dinheiro, badges → `progressionSummary`/`progressionQueue` → evolução/moves.
