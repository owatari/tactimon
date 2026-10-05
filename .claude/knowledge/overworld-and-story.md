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

## Paridade FireRed (task 2026-10-04-002)
- **world.json de todos os mapas** (`maps.ts` `worldUrl`, `sync-assets.mjs`). Só renderiza NPC de ROM se houver texto curado em `lib/worldTexts.ts` (`WORLD_NPC_TEXT`, chave `mapId:x,y` em coordenadas da ROM) ou script em `dialogueSystem.ts`; exceção: `FULL_WORLD_OBJECT_MAPS` (Pallet, Route 1, Viridian City, Oak Lab). Trainers/clerks/nurses/story NPCs continuam autorais. Placas = `bg_events` kind 0 com texto em `WORLD_SIGN_TEXT`.
- **Warps de interiores novos**: `lib/generatedWarps.ts` (gerado da ROM; `resolveWarpTransitionAt` consulta a tabela manual primeiro). Mapas novos usam `<tipo>-<n>` (ex.: `ss-anne-2f-room-4`, `cerulean-house-3`).
- **Itens**: `OVERWORLD_PICKUPS` (bolas + `hidden: true`) vêm dos eventos da ROM; engine só tem Potion/Poké Ball → demais itens vão para `StoryState.bagItems` (`lib/items.ts`), sem uso em batalha ainda. TMs/berries/held ficam fora (dungeon/raid).
- **Marts**: `MART_STOCK` por cidade (listas `pokemart` da ROM). Trainers extras gerados da tabela `gTrainers` (base `0x23EAC8`, 40 bytes/struct).
- Texto/ROM: ROM FireRed em `local-assets/roms/firered.gba`; scripts de NPC = `loadword 0 ptr; callstd 4`; item ball = `1a 00 80 <item16>`; hidden item = `raw_value` (item16, flag8, qty7|underfoot1).
