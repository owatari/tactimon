# Plan — 2026-10-05-014-ui-audit-firered-fidelity

## Objetivo
A UI atual não respeita a ROM. Auditar TODAS as telas e aplicar melhorias para ficar o mais próximo possível do FireRed: **começando pela Pokédex**, depois Start menu, Party, Summary, Bag, Trainer Card, Options, Save, Town Map, Mart, PC/Storage, caixas de diálogo/nomes, Poké Center, batalha (menu de golpes/HUD/pós-batalha/XP/level-up/evolução), Game Corner, trocas, Day Care, prompts de pesca/Surf, título/new game, whiteout.

## Método
1. Referência: assets de UI da ROM em `local-assets/` (NÃO varrer; só paths específicos) e layout/paleta/fonte/bordas/cursor/barras do FireRed.
2. Por tela: captura atual (Playwright/Edge headless; 1365×768 e ~1792×851) → tabela em verification.md "tela → desvios → correção".
3. Corrigir em lotes pequenos por tela; Pokédex primeiro (lista com ícones, página de dados, áreas, ordem Kanto, seen/caught).
4. Extrair componentes comuns (janela FireRed, texto, cursor) em vez de CSS duplicado.

## Acceptance criteria
- [ ] Tabela de auditoria completa (todas as telas listadas) em verification.md com screenshots antes/depois (paths temporários).
- [ ] Pokédex refeita fielmente (lista, entrada, áreas, contadores).
- [ ] Sem gradient/glassmorphism/card SaaS; pixel art, `image-rendering: pixelated`, sprites não esticados.
- [ ] Todo texto novo via `t()`/`tx()` + catálogo en/pt/es/fr/zh; `tests/i18n.test.ts` verde.
- [ ] Testes de render atualizados; typechecks; `pnpm test` sem falhas novas.

## Arquivos prováveis
`apps/client/components/StartMenu.tsx` (959 linhas — ler por ranges), `StorageOverlay.tsx`, `MartOverlay.tsx`, `BattleResultsScreen.tsx`, `PokemonEvolutionOverlay.tsx`, `ProgressionOverlay.tsx`, `FirstBattle.tsx` (HUD), `apps/client/app/globals.css`, `lib/i18n/catalog/ui.ts`.

## Riscos
Escopo grande: commits por tela e checkpoint em progress.md a cada tela; não quebrar `tests/start-menu-render.test.tsx` e `tests/pokedex.test.ts`. Componentes compartilhados com a task 013 — extrair aqui se 013 ainda não o fez.

## Commits
Um por tela/grupo: `feat: FireRed-faithful Pokédex UI`, `feat: FireRed-faithful Bag/Party/Summary`, ... + `test:` correspondentes.
