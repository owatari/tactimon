---
name: battle-development
description: Workflow para alterar a engine de batalha (duel.ts) e a apresentação de batalha (FirstBattle.tsx) — invariantes, seeds determinísticas, spawn/navegação, testes de regressão.
---
# Battle development

Knowledge: `.claude/knowledge/battle-system.md`.

- Engine pura e determinística: toda aleatoriedade via `createSeededRandom(seed)`. Testes usam seeds fixas.
- Invariantes: nenhuma unidade em `blocked`; posições únicas; unidade `hp <= 0` não ocupa tile, não recebe turno, não é alvo, não bloqueia pathfinding.
- Spawn: maior componente conectado, preferência por áreas abertas, times em lados opostos, anchors a ~4–7 tiles, 6×10 deve funcionar (`test/spawn-placement.test.ts`, `test/duel.test.ts` › "deployment scale").
- Terreno da arena (bloqueado, água/surf-only via `isWaterCell`) é calculado no client (`OverworldGame.tsx`, contexto da arena) e chega à engine como `blocked`.
- Nunca enfraquecer teste antigo para acomodar mudança; ajuste o algoritmo.

```
pnpm --filter @tactimon/battle-engine exec vitest run test/<arquivo>
pnpm --filter @tactimon/battle-engine typecheck
```
Mudou apresentação? siga `pokemon-ui` (screenshot).
