# Plan — 2026-10-05-017-battle-ui-fidelity

## Objetivo
Terminar a auditoria de UI: HUD de batalha, pós-batalha/XP/level-up, evolução, Game Corner, Save/Day Care/título/whiteout no estilo FireRed; traduzir as descrições da Pokédex (en→pt/es/fr/zh); remover CSS legado (border-radius grande, gradientes, backdrop-filter).

## Acceptance criteria
- [ ] Tabela de auditoria com screenshots 1365×768 e ~1792×851 por tela.
- [ ] Sem gradient/glass/cards SaaS nas telas listadas.
- [ ] i18n completo (tests/i18n verde); descrições da Pokédex traduzidas.
- [ ] typechecks e pnpm test verdes; testes de render atualizados.

## Riscos
FirstBattle.tsx e CSS de batalha são grandes; não quebrar layout 6v6; validar com rota local /battle-preview.

## Commits
Um por tela/grupo.
