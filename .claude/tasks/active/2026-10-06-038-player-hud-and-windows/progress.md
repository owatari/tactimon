# Progress — 2026-10-06-038-player-hud-and-windows
- [x] Fase 1 HUD — PlayerHud.tsx, OverworldGame (hudWindows, atalhos 1-6, remove run-indicator/control-hint), StartMenu `initialScreen` (voltar fecha), GameClient `menuScreen`, globals.css, i18n ui.ts, tools/e2e/{helpers,hud.e2e}.ts — typecheck ok, e2e hud 4/4, screenshots 1365/1792 ok
- Decisão: Esc continua abrindo o menu-lista (fallback); botão BACK envia Escape.
- Próximo: Fase 2 Pokémon window (drag/drop, summary lateral, reorder de golpes)
- [x] Fase 2 Pokémon window — PokemonWindow.tsx, dragDrop.tsx (hook pointer-based, reutilizar nas próximas fases), MoveSlots onReorder (Alt+setas), StartMenu party usa PokemonWindow (hover=Summary lateral via cursor, clique fixa, golpes arrastáveis quando fixado), lib gameMenu `reorderPartyMoves` + testes, i18n, e2e pokemon.e2e.ts 2/2, walkthrough 26/26, tests 556 ok
- Decisão: líder continua travado (regra existente/teste); teclado mantém Enter→SUMMARY/SWITCH.
- Próximo: Fase 3 PC (5 boxes pagas, migração, drag/drop), depois Bag, Market+Premier
