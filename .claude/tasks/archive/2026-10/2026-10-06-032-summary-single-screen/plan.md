# Plan — 032 Summary em uma tela só

## Estado atual (investigado)
O Summary do Start Menu (`apps/client/components/StartMenu.tsx`) tem 3 páginas (`SummaryPage = info | stats | moves`, `SUMMARY_PAGES`), trocadas com esquerda/direita; golpes têm sub-estado (`summaryMove`, `summaryMoveInfo`). A tela de captura (task 027) já tem o layout condensado de referência (identidade, tabela STAT/IV/EV, 4 slots + painel de detalhes).

## Objetivo
Uma única tela com tudo visível sem trocar de página: retrato/nome/nível/tipos/nature/OT-info, HP e EXP, tabela STAT/IV/EV, 4 slots de golpe com painel de detalhes, no padrão FireRed (`fr-window`, pixel art), reaproveitando `TypeIcon`, `MoveSlots` e a tabela da `CaptureSummary` (extrair componente comum, ex.: `PokemonSummaryCard`).

## Acceptance
- [ ] Todas as informações das 3 páginas atuais aparecem juntas (info, stats/IV/EV, golpes com PP e detalhes); nada perdido.
- [ ] Sem setas de página; ←/→ (e Q/E) passam para o Pokémon anterior/seguinte da party; ↑/↓ percorrem os golpes; A abre o detalhe do golpe; B volta.
- [ ] Cabe em 1365×768 e ~1792×851 sem scroll; em telas estreitas empilha em colunas.
- [ ] `CaptureSummary` e Summary compartilham o mesmo componente de tabela/slots (sem duplicação).
- [ ] i18n 5 idiomas para rótulos novos; E2E (walkthrough) cobre abrir o Summary e navegar; `pnpm test` e typechecks verdes.

## Arquivos prováveis
apps/client/components/StartMenu.tsx, CaptureSummary.tsx, MoveSlots.tsx, novo componente comum, app/globals.css, lib/i18n/catalog, tools/e2e/walkthrough.e2e.ts, tests.

## Riscos
Muita informação para 1365×768 (priorizar densidade: grid 3 colunas); navegação por teclado dos golpes precisa continuar igual ao FireRed; Summary é acessado também do Pokémon da PC/box se existir.

## Testes
Teste de componente/lib para dados exibidos; E2E: abrir Summary, ver 4 slots + tabela, trocar de Pokémon; screenshots nas duas resoluções.

## Ordem de commits
1. `refactor: shared Pokémon summary card` 2. `feat: single-screen summary` 3. `docs: UI knowledge`
