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

## Mundo gerado da ROM (fase D)
- Geradores em `tools/rom-data/` (rodam com a ROM local; só o TS gerado é versionado): `extract-kanto-data.py` → `packages/game-data/data/*.json`; `generate-engine-species.py` → `packages/battle-engine/src/generated/kanto.ts` (151 espécies/golpes/evoluções); `generate-world-maps.py` → `apps/client/lib/generated/{worldMaps,worldWarps}.ts` + `scripts/generated-sync.json`; `generate-world-content.py` → encontros, itens, marts, trainers, gates, textos EN. Reexecutar na ordem maps → content depois de `sync-assets`.
- Mapas novos usam kebab da ROM (`celadon-city-gym`, `silph-co-11f`, `pokemon-tower-7f`…). Textos pt-BR: `worldTextsKantoNpcPt.ts`, `worldTextsKantoSignPt.ts`, `trainerTextsKantoPt.ts`, `trainerTextsPt.ts` (líderes/E4). NPC de evento sem tradução **não** é renderizado (evita oferecer gifts/tutors que não existem).
- Água bloqueia sem Surf (`canStoryUseSurf` = HM + Soul Badge); Champion Blue depende de `rivalStarter` (`requiresRivalStarter`); portas da League abrem pelo trainer derrotado (`generated/worldGates.ts`).
- `tests/world-reachability.test.ts` percorre warps/conexões/ledges/água e falha se um mapa do mainland ficar inalcançável.

## Mecânicas de campo e quests (fase C/D final)
- **Dados gerados da ROM** (`tools/rom-data/generate-world-obstacles.py` → `lib/generated/worldObstacles.ts`): árvores de Cut, boulders (Strength), bolas de key items, estáticos (Snorlax/Zapdos/Articuno/Mewtwo), portas Card Key da Silph (`SILPH_DOORS`), slots do Game Corner, barreiras/estátuas da Mansion (rotina `0x1A7B7A`), quiz da Cinnabar Gym. `generate-world-water.py` → `worldWaterEncounters.ts` (surf + pesca Old/Good/Super).
- **Camada de quests** (client/lib): `questDialogues.ts` (scripts de NPC; só importa *tipos* de `dialogueSystem` para evitar ciclo), `questGates.ts` (gates de tile: guardas de Saffron/Tea, fantasma da Torre/Silph Scope, Secret Key, Card Key, Mansion, quiz Cinnabar, elevador Rocket, Cerulean Cave só para Campeão), `questEvents.ts` (ids de eventos/choices), `scriptedWorldObjects.ts` (objetos invisíveis/visíveis com `visibleWhen`, `wildBattle`, `pushable`).
- **Portas/barreiras fechadas** (Silph, Mansion, Cinnabar) são metatiles com colisão: as células entram em `QUEST_OPEN_CELLS` (andáveis em `isWorldOpenCell`) e o tile gate decide a passagem.
- **Batalhas estáticas**: `WildBattleSpec` (`staticEncounters.ts`) em objeto ou gate → `OverworldGame.startStaticBattle` → `onWildBattleTrigger({staticId})` → `GameClient` grava o evento `story:static:<id>` ao vencer/capturar.
- **HMs** (`fieldTechniques.ts`): Cut/Surf/Strength/Flash/Fly exigem a insígnia FireRed; Strength empurra boulders (`boulders.ts`, posição em `choices["boulder:<id>"]`, resetada a cada `loadMap`); Flash acende o Rock Tunnel (`darkCaves.ts`); Fly via Town Map (`townMap.ts`, visitas = eventos `story:visited:<mapId>`).
- **Estado novo no StoryState**: `coins`, `safari {steps,balls,savedBalls}`, `dayCare {pokemon,startLevel,steps}`; passo a passo em `storySteps.advanceStoryStep` (veneno + Day Care + Safari).
- **Sistemas**: `safari.ts`, `dayCare.ts`, `gameCorner.ts`, `inGameTrades.ts` (9 trocas da tabela `0x26CF8C`), `tutors.ts` (Mega Punch/Kick, Route 4), `waterEncounters.ts` (tecla F pesca).
- Pedido de movimento por diálogo: `DialogueInteractionRequest {kind:"warp"}` (elevador Rocket): `OverworldGame` carrega o mapa ao fim do diálogo.
- Não incluídos de propósito: TMs/Held items (raids), Sevii Islands, Rock Smash/Waterfall, Cycling Road, elevadores da Silph/Dept. Store (andares por escada).
