# Handoff 038
- HUD permanente + janelas Pokémon, PC (5 boxes + compra), Bag (grade/hover/drag-to-use), Market (tudo à venda, comprar/vender por drag, Premier Ball bônus). Detalhes em knowledge/ui-and-art-direction.md e saves-and-progression.md.
- Testar: `pnpm test`; com `pnpm dev`: `pnpm exec vitest run --config tools/e2e/vitest.config.ts hud pokemon pc bag market`.
- Decisões: Esc ainda abre menu-lista; líder da party travado; bag sem raridade/origem de drop (não há dados); sem split de preços por cidade.
- Pendência: mapa/Town Map, Save e demais telas continuam no StartMenu (sem janela própria).
