# Pedido original

"Finalizar polish de combate, sprites, pós-batalha, tutorial do Blue, Running Shoes, battle spawn e investigar whiteouts/teleports indevidos."

Itens (do handoff do usuário, 2026-10-04):

- **A** Finalizar trabalho local pendente: Running Shoes (unlock único após Boulder Badge na Route 3, persistido, R = toggle WALK/RUN, RUN claramente mais rápido, nunca antes do unlock, indicador HUD) e spawn tático (maior componente navegável, sem água/surf-only/bloqueado/preso/ilhas, área aberta, distância ~4–7, lados definidos, 6×10, posições únicas). Corrigir regressão `duel.test.ts` › "deploys large wild packs with player units on the left and enemies on the right" (expected 8 > 8.5) **sem enfraquecer o teste**.
- **B** Auditoria sistemática das sprites de batalha de todas as espécies (Paras, Zubat pequenos; Onix com offset errado; não são os únicos). Investigar causa; preferir metadata normalizada/cálculo automático por bounding box visível; script/teste de auditoria; inspeção visual em grid.
- **C** Unificar pós-batalha: uma única tela FireRed-style compacta (vitória/derrota, Pokémon, XP, levels, moves, captura, dinheiro, progressão), evolução como evento separado, sem telas redundantes, cabendo no viewport.
- **D** Pokémon derrotado some sem delay: lógica imediata, visual imediato ou faint muito curto.
- **E** Derrota contra Blue no lab (tutorial): cura total, PP, status, continua no lab, sem whiteout; vitória e derrota testadas; whiteout normal intacto.
- **F** Teleportes esporádicos para Pokémon Center: mapear todos os caminhos, achar causa, corrigir com testes, whiteout legítimo intacto.

Testes obrigatórios: typecheck engine + client, `pnpm test`, screenshots de UI (1365×768, ~1792×851).
