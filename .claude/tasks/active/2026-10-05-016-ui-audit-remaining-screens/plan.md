# Plan — 2026-10-05-016-ui-audit-remaining-screens

## Objetivo
Concluir a auditoria de UI da task 014 (que cobriu Pokédex, sprites FR em Party/Summary e ajustes no Trainer Card): deixar o restante o mais parecido possível com o FireRed.

## Escopo
Bag (bolsa à esquerda, lista à direita, setas de bolso), Trainer Card FR (nome/ID/dinheiro/Pokédex/tempo + medalhas com sprite), Party 2 colunas (líder grande), Summary FR (páginas, barra de EXP, golpes com tipo), Options, Save, Town Map, Mart, PC/Storage, HUD de batalha, pós-batalha/XP/level-up, evolução, Game Corner, Day Care, prompts de pesca/Surf, título/novo jogo, whiteout. Traduzir descrições da Pokédex (en→pt/es/fr/zh). Avaliar extrair molduras/paleta reais da ROM.

## Acceptance criteria
- [ ] Tabela de auditoria completa (cada tela: desvio → correção) com screenshots 1365×768 e ~1792×851.
- [ ] Sem gradients/glass/cards SaaS; pixel art; sprites sem esticar.
- [ ] Texto novo via t()/tx() + 5 idiomas; tests/i18n verde.
- [ ] Testes de render atualizados; typechecks; pnpm test sem falhas.

## Riscos
Escopo grande: commits por tela; StartMenu.tsx grande (ler por ranges); reutilizar `.fr-window` e `.dex-*`.

## Commits
Um por tela/grupo.
