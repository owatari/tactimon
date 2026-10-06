# Plan — 035 mouse + camada de input (teclado / mouse / controle)
## Estado atual (investigado)
Cada menu trata `keydown` por conta própria (ex.: `StartMenu.tsx` com `up/down/left/right/confirm/back`, `CaptureSummary.tsx`, dock/menus de `FirstBattle.tsx`, loja/PC/diálogos em `GameClient`/`OverworldGame`). Mouse existe só em pontos isolados (hover muda foco em alguns botões).
## Objetivo
1. **Camada única de input** (`lib/input/`): ações abstratas `up/down/left/right/confirm/back/menu/…` emitidas por teclado (atual), **mouse** (LMB = confirm, RMB = back com `contextmenu` suprimido; hover move o cursor/foco; roda = up/down em listas) e, futuramente, **gamepad** (Gamepad API: D-pad/stick, A = confirm, B = back). Implementar o adaptador de gamepad mínimo ou deixar o ponto de extensão testado.
2. Migrar menus para consumir ações (hook `useMenuInput(handler)`) em vez de `keydown` direto: Start Menu (todas as telas), diálogos/caixas de texto, batalha (ações, itens, alvos, golpes), loja, PC/box, tela de captura, progressão/evolução, título/opções.
3. **Mouse nos menus:** hover seleciona a linha; LMB nela = confirmar; RMB em qualquer lugar = voltar; clique em alvo da arena escolhe o alvo; sem quebrar o clique atual do mapa.
4. Dicas de ajuda ("↑↓ move · Enter confirm") contextuais ao dispositivo ativo (opcional).
## Acceptance
- [ ] Todo menu citado funciona 100% só com mouse (LMB/RMB/hover/roda) e 100% só com teclado, com confirm/back idênticos.
- [ ] RMB nunca abre o menu de contexto do navegador dentro do jogo; não interfere com digitação (nickname).
- [ ] Adaptador de gamepad (ou stub testado) mapeando D-pad/A/B para as mesmas ações; testes unitários da camada (teclado→ação, mouse→ação, gamepad→ação, supressão em input de texto).
- [ ] E2E (CDP `Input.dispatchMouseEvent`): Start Menu por hover + LMB/RMB; batalha: escolher ação e alvo só com mouse.
- [ ] i18n das novas dicas; screenshots; `pnpm test`/walkthrough/playthrough verdes (o playthrough usa teclado e não pode regredir).
## Arquivos prováveis
apps/client/lib/input/* (novo), StartMenu.tsx, FirstBattle.tsx, CaptureSummary.tsx, GameClient.tsx, OverworldGame.tsx, globals.css, tests/, tools/e2e.
## Riscos
Muitos `keydown` globais em captura (`addEventListener(..., true)`) competindo; migração incremental menu a menu; clique do mapa (andar/interagir) não pode ser sequestrado; foco em `<input>`.
## Ordem de commits
1. `feat: input action layer (keyboard, mouse, gamepad)` 2. `feat: start menu and dialogs on the input layer` 3. `feat: battle menus mouse support` 4. `feat: remaining menus` 5. `docs`
