# Saves e progressão

## Persistência
- `apps/client/lib/storyPersistence.ts`: chave `tactimon.story.v1` (+ `.backup` = valor anterior). Envelope `{version: 2, story}`; legacy v1 = StoryState cru.
- `chooseBestStorySave(primary, backup)`: escolhe por `storyProgressScore` (backup só vence se tiver mais progresso).
- Gravação: efeito em `GameClient` a cada mudança de `story` (após hidratação).
- Posição: `tactimon.position.v1` (`OverworldGame.savePlayerPosition`, a cada passo/loadMap). Run mode: `tactimon.run-mode.v1`.
- **Normalização**: `normalizeStoryState` (story.ts) é a única porta de entrada de saves; todo campo novo precisa de default seguro lá. `playerWorldState.ts` tem versão própria (`PLAYER_WORLD_STATE_VERSION`).

## Progressão (`packages/battle-engine/src/progression.ts`)
- `PokemonProgression` (species, level, xp, EVs, activeMoves, movePp, currentHp, status...).
- XP: `experienceRewardForWild/Trainer`, `grantWildBattlesProgressToParty`, `grantTrainerBattleProgressToParty` (divide entre participantes).
- Moves/evolução: `resolveMoveLearning`, `ProgressionEvolution`; UI em `ProgressionOverlay`, `PokemonEvolutionOverlay`, `BattleProgressionSummary`.
- `GameClient.applyPartyProgressionRewards` grava no StoryState.

Testes: `tests/story-persistence.test.ts`, `tests/storage.test.ts`, `tests/whiteout.test.ts`, `packages/battle-engine/test/progression.test.ts`.

## Campos adicionados na fase C/D final
- `coins`, `safari`, `dayCare` (normalizados em `normalizeStoryState`; saves antigos → `0/null/null`).
- Key items novos em `StoryKeyItemId` (tea, silph-scope, poke-flute, card-key, lift-key, secret-key, gold-teeth, coin-case, 3 varas) e HMs `strength/flash/fly` em `STORY_FIELD_TECHNIQUE_IDS`; valores desconhecidos são filtrados.
- Eventos `reward:gift:<id>`, `reward:trade:<id>`, `story:static:<id>`, `story:visited:<mapId>`, `story:silph-door:*`, `story:cinnabar-door:*`; choices `mansion-switch`, `route-4-mega-tutor`, `boulder:*`.
- Bag: `master-ball`, `ultra-ball` entram na batalha via `toBattleInventory`.

## Personalidade (nature + IVs) — task 020
- `packages/battle-engine/src/personality.ts`: 25 natures (±10% inteiro, 5 neutras), `IvSpread` (0–31), `rollPersonality(random)`. `PokemonProgression`/`DuelPokemonBuild`/`DuelUnit` têm `ivs?` e `nature?`.
- Ausentes = IV 15 + nature neutra: saves antigos, parties de treinadores e testes mantêm os stats de antes (não são reescritos). Rolam personalidade: inicial (`chooseStarter`), selvagens (semeado por `seed`+índice em `createWildDuel`, e a captura leva o mesmo par), presentes e trocas in-game.
- UI: nomes em `lib/natures.ts` + `catalog/natures.ts`; Summary mostra NATURE e tinge stats (vermelho +, azul −). IVs/EVs detalhados aparecem na tela de captura (task 021).

## EVs estilo FireRed — task 025
- Sem EVs por level-up. Cada Pokémon **derrotado** dá o EV yield da espécie (ROM, `generated/evYield.ts`, gerado por `tools/rom-data/generate-ev-yields.py`) a todos os participantes (completo, não dividido como o EXP). Captura não dá EV (`evYield: false`). Teto 252/stat e 510 total (`addEvs`).
- Vitaminas (HP Up, Protein, Iron, Calcium, Zinc, Carbos; vendidas no Celadon): +10 EV, param em 100 por stat (`grantVitamin`, `ITEM_EFFECTS` kind `vitamin`).
- Saves antigos mantêm os EVs que já tinham (só param de crescer pelo sistema antigo).

## Captura: tela de escolha — task 021
- Captura bem-sucedida **não** coloca o Pokémon na party: `holdCapturedPokemon` grava `story.pendingCapture` (persistido; reabre após reload). `CaptureSummary` (retrato FireRed, stats, IV/EV, nature ▲▼, golpes, apelido ≤10, SEND TO TEAM / SEND TO BOX) chama `resolvePendingCapture` (`lib/captureChoice.ts`): party cheia → escolhe quem vai pro box; box cheia → recusa.
- Espécie nova: o aviso "NEW POKéDEX ENTRY" fica na tela e a página de registro (com cry) é pulada (`capturePageSpeciesRef` em `GameClient`). `nickname` vive em `PokemonProgression`/`DuelUnit`; exibir com `pokemonDisplayName`.

## Shiny — task 023
- Só selvagens rolam shiny: `rollShiny` 1/8192 (`SHINY_ODDS`, `personality.ts`), sorteio semeado em `createWildDuel` (opção `shinyOdds` para testes); a captura carrega `shiny` (`captureResult`) → `PokemonProgression.shiny`. Inicial, presentes, trocas e treinadores nunca são shiny.
- Sprites: batalha/overworld usam `animations[x].shinyFile` (SpriteCollab `<id>/0000/0001`, copiado por `tools/sprite-importer` para `pokemon-sprites/<espécie>/shiny/`); Summary/captura usam o front sprite da ROM com paleta shiny (`pokemon/front/shiny`, sincronizado por `sync-assets.mjs`). Indicador: `ShinyStar` ★ dourada (party, Summary, HUD de batalha, storage) e banner "SHINY!" na tela de captura.
