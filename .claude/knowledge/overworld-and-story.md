# Overworld e story

Docs longos: `docs/WORLD_STATE.md`, `docs/DIALOGUE_SYSTEM.md`, `docs/PROGRESSION.md`.

## Mapas — `apps/client/lib/maps.ts`
- `WORLD_MAPS` (id → layoutUrl/worldUrl/tilesets/spawn/música). `TILE_SIZE`, `getMapCell`, comportamentos de metatile (`hydrateMapBehaviors`, `isLedgeCell`, `isCounterCell`, `isWaterCell` = behaviors FireRed 0x10–0x17).
- Transições: `resolveWorldTransition` (bordas), `resolveWarpTransitionAt` (portas). Respawn: `resolveWhiteOutRespawn(healLocationId)`.

## Runtime — `apps/client/components/OverworldGame.tsx`
- `loadMap(mapId, spawn, facing)` com token anti-race; salva posição (`tactimon.position.v1`).
- Montagem: restaura posição salva se há starter; senão Pallet Town.
- Passos: `applyStoryOverworldStep` (poison de campo a cada 5 passos) → `onOverworldStep`.
- Triggers após passo: lab battle (Blue), rivais (Route 22, Cerulean, SS Anne), Rocket, trainers por visão, wild encounters (`wildEncounters.ts`: `resolveScaledWildEncounter`).
- Running Shoes: trigger ao entrar na Route 3 com Boulder Badge → `grantRunningShoes`; R alterna WALK/RUN (`RUN_MODE_STORAGE_KEY`).

## Story — `apps/client/lib/story.ts`
- `StoryState`: starter, `playerPokemon` + `capturedPokemon` (party = 1 + até 5), `boxedPokemon`, inventory, money, badges, trainers derrotados, itens, key items, field techniques, obstáculos, `healLocationId`, `playerWorld` (eventos/choices), flags.
- Whiteout: `storyHasHealthyPokemon`, `applyStoryWhiteOut` (cura + perda de dinheiro FireRed), `registerStoryHealLocation` (ao entrar em Pokémon Center, via `GameClient.handleMapAudioContextChange`).
- Trainers: `lib/trainers.ts` (`OVERWORLD_TRAINERS`, encontros de rival).
- Diálogos/eventos: `dialogueSystem.ts`, `overworldDialogues.ts`, `npcDialogues.ts`, `scriptedWorldObjects.ts`, `playerWorldGates.ts`.
