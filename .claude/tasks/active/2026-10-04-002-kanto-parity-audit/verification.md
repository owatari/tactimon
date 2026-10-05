# Verification — 2026-10-04-002-kanto-parity-audit

## Matriz de paridade (resumo)
| Área | Status | Notas |
| --- | --- | --- |
| Lixo na raiz / .gitignore | ok | commit d25efa12; lockfile versionado ede6ad0b |
| Itens visíveis + ocultos (mapas existentes) | ok | 40 pickups; TMs, berries e Macho Brace omitidos (exceção held/TM) |
| Itens em SS Anne rooms/cozinha/B1F | ok | adicionados com os interiores (Oak Lab balls = starters, fora) |
| NPCs/placas dos mapas existentes | ok (parcial) | 51 NPCs + ~60 placas com texto pt-BR; sem NPC: tutors Mega Punch/Kick (Route 4), Magikarp salesman, Pewter guide, VS Seeker, Jigglypuff (som), NPCs de evento com flag |
| Mapas com `worldUrl` nulo | ok | todos os 43 agora usam world.json |
| Interiores (42 novos mapas) | ok (parcial) | feitos com warps gerados; restam gates (Route 2 East, Route 5 S, Route 6 N, Route 22 N), PC 2F ×5 (Cable Club), Viridian Gym, Diglett's/Cerulean Cave. Antes: Pallet (casa player/rival), Viridian (House, School, Gym), Pewter (Museum, 2 casas), Route 2 (House, EastBuilding), Cerulean (BikeShop, 4 casas), Vermilion (Fan Club, 3 casas), Route 5 Day Care + gates (R5 S, R6 N, R22 N), SS Anne (7+6 quartos, cozinha, B1F), PC 2F ×5 (Cable Club, adiado), Diglett's/Cerulean Cave (fora de escopo) |
| Trainers | ok | +19 (Liam, Jovan, Miriam, 16 SS Anne); Tentacool/Ponyta adicionados |
| Eventos | faltando | Old Amber (Museum), Fan Club/Bike Voucher, Fishing Guru, Magikarp, Daisy/Town Map, Mom, Day Care, tutors Route 4, trades — dependem de mecânicas inexistentes |
| Itens usáveis (Antidote, Super Potion, Revive, Great Ball…) | parcial | itens novos vão para `bagItems` (coletáveis e comprados) mas sem uso em batalha/campo |
| Marts por cidade | ok | `MART_STOCK` das listas da ROM |

## Comandos
- `pnpm exec vitest run` → 59 arquivos / 454 testes ✓; engine `vitest` 200 ✓; typechecks client + engine ✓
- Encounters: tabelas existentes parecem derivadas da ROM; não reconferidas slot a slot.
- `pnpm --filter @tactimon/client typecheck` ✓
- Screenshots: NÃO realizadas (sem ferramenta de browser na sessão; porta 3000 já ocupada por dev server do usuário). Assets sincronizados com `node apps/client/scripts/sync-assets.mjs`.
