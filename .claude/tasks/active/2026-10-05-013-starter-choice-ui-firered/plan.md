# Plan — 2026-10-05-013-starter-choice-ui-firered

## Objetivo
`apps/client/components/StarterChoice.tsx` (66 linhas) usa cartões arredondados estilo SaaS; refazer fiel ao FireRed: mesa do Prof. Oak com as 3 Poké Bolas, caixa de diálogo FireRed, confirmação Yes/No (menu de caixa FireRed), pixel art, sem gradient/glassmorphism/cards.

## Acceptance criteria
- [ ] Sem cards arredondados/gradients; fonte e caixas no padrão de `StartMenu`/diálogos.
- [ ] Fluxo: selecionar bola → espécie/descrição → confirmar Yes/No → `chooseStarter`; teclado (setas/Z/X) e clique.
- [ ] i18n: todo texto em `t()` + catálogo 5 idiomas; `tests/i18n.test.ts` verde.
- [ ] Screenshots 1365×768 e ~1792×851 sem sprites esticados (`image-rendering: pixelated`).
- [ ] Teste de render (padrão `tests/start-menu-render.test.tsx`) cobrindo o fluxo.

## Arquivos prováveis
`apps/client/components/StarterChoice.tsx`, `GameClient.tsx` (props), `apps/client/app/globals.css`, `apps/client/lib/i18n/catalog/ui.ts`.

## Riscos
Overlay deve continuar bloqueando input do overworld (`starterChoiceOpen`, GameClient ~937); guards de `story.starter` (bug da task 007).

## Commits
1. `feat: FireRed-style starter selection screen` 2. `test: starter choice render`
