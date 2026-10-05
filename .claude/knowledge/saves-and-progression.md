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
