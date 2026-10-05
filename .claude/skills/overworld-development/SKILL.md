---
name: overworld-development
description: Workflow para story, mapas, eventos de mundo, transições, saves, whiteout/respawn e progressão do overworld.
---
# Overworld development

Knowledge: `.claude/knowledge/overworld-and-story.md`, `.claude/knowledge/saves-and-progression.md`.

- Lógica de estado em funções puras de `apps/client/lib/*.ts` (testáveis em `tests/`); componentes só orquestram.
- Campo novo em `StoryState`: `DEFAULT_STORY_STATE` + `chooseStarter` + `normalizeStoryState` (default seguro para save antigo) + teste de normalização.
- Atualizações de story vindas do `OverworldGame` devem ser **funcionais** (updater aplicado ao estado atual do `GameClient`), nunca snapshot inteiro de `storyRef`.
- Teleporte/respawn só via `respawnRequest` consumido **uma vez** (por id). Whiteout só quando `!storyHasHealthyPokemon` fora de batalha. Tutorial do Blue (lab) nunca faz whiteout.
- Eventos one-shot: flag persistida no StoryState ou eventos `playerWorld` (`completeStoryPlayerEvent`).

```
pnpm exec vitest run tests/<arquivo>.test.ts
pnpm --filter @tactimon/client typecheck
```
