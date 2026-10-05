# Verification — 2026-10-04-002-kanto-parity-audit

## Matriz de paridade (resumo)
| Área | Status | Notas |
| --- | --- | --- |
| Lixo na raiz / .gitignore | ok | commit d25efa12; lockfile versionado ede6ad0b |
| Itens visíveis + ocultos (mapas existentes) | ok | 40 pickups; TMs, berries e Macho Brace omitidos (exceção held/TM) |
| Itens em mapas inexistentes (SS Anne rooms/cozinha/B1F, Oak Lab balls) | faltando | dependem dos interiores |
| NPCs/placas dos mapas existentes | ok (parcial) | 51 NPCs + ~60 placas com texto pt-BR; sem NPC: tutors Mega Punch/Kick (Route 4), Magikarp salesman, Pewter guide, VS Seeker, Jigglypuff (som), NPCs de evento com flag |
| Mapas com `worldUrl` nulo | ok | todos os 43 agora usam world.json |
| Interiores faltando (45 destinos de warp) | faltando | Pallet (casa player/rival), Viridian (House, School, Gym), Pewter (Museum, 2 casas), Route 2 (House, EastBuilding), Cerulean (BikeShop, 4 casas), Vermilion (Fan Club, 3 casas), Route 5 Day Care + gates (R5 S, R6 N, R22 N), SS Anne (7+6 quartos, cozinha, B1F), PC 2F ×5 (Cable Club, adiado), Diglett's/Cerulean Cave (fora de escopo) |
| Trainers | faltando | 57 trainers ROM vs 54 autorais; SS Anne (rooms/deck) sem trainers; comparar por mapa |
| Eventos | faltando | Museum, Fan Club/Bike Voucher, Magikarp, Pewter guia, Oak's Parcel check, Day Care, tutors |
| Itens usáveis (Antidote, Super Potion, Revive, Great Ball…) | faltando | engine só tem Potion/Poké Ball; itens novos vão para `bagItems` sem uso em batalha; Mart só vende Potion/Poké Ball |
| Marts por cidade (estoque FireRed) | faltando | `VIRIDIAN_MART_ITEMS` usado em todos |

## Comandos
- `pnpm exec vitest run` → 57 arquivos / 446 testes ✓
- `pnpm --filter @tactimon/client typecheck` ✓
- Screenshots: NÃO realizadas (sem ferramenta de browser na sessão; porta 3000 já ocupada por dev server do usuário). Assets sincronizados com `node apps/client/scripts/sync-assets.mjs`.
