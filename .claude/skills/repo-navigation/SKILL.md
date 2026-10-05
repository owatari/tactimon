---
name: repo-navigation
description: Navegação econômica do repositório Tactimon (rg, ranges, arquivos a ignorar). Use ao localizar código antes de editar.
---
# Navegação econômica

1. Assunto → `.claude/knowledge/INDEX.md` → arquivo de knowledge (aponta arquivos reais).
2. Símbolo → `rg -n "simbolo" apps/client/lib apps/client/components packages tests`.
3. Ler só o range (Read com offset/limit). Arquivos grandes: `duel.ts` (~7.8k linhas), `OverworldGame.tsx` (~2.5k), `FirstBattle.tsx` (~2.2k), `trainers.ts`, `maps.ts`, `globals.css` (~5.8k).
4. Exports de um módulo: `rg -o "^export (function|const|type) \w+" <arquivo>`.
5. Testes de uma área: `rg -l "simbolo" tests packages/battle-engine/test`.
6. Diff: `git diff --stat` antes de `git diff -- <arquivo>`.

Ignorar sempre: `node_modules/`, `.next/`, `local-assets/`, `apps/client/public/game-assets/`, JSON grandes (manifests, layouts de mapa), imagens/áudio/binários.
Antes de criar algo novo, procure o equivalente existente (ex.: `connectedOpenCells`, `normalizeStoryState`, `healStoryParty`, `resolveWhiteOutRespawn`).
