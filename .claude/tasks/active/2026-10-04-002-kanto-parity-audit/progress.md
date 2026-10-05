# Progress — 2026-10-04-002-kanto-parity-audit

## 2026-10-04 23:25 — checkpoint
- [x] F1 limpeza — .gitignore, lockfile versionado, lixo da raiz removido — commits d25efa12, ede6ad0b
- [x] Itens — `lib/items.ts` (bagItems por player), `overworldPickups.ts` (40 itens/ocultos até Vermilion, sem TM/berries/held), testes — commit 33f5ad44
- [~] NPCs/placas — world.json habilitado p/ 40 mapas (maps.ts + sync-assets), `lib/worldTexts.ts` (pt-BR), placas interativas, NPCs inventados de Mart/PC removidos — falta validar visualmente + commit
- [ ] Interiores faltando (45 destinos; ver matriz) — casas, Museum, Bike Shop, Fan Club, SS Anne rooms, Pallet houses, School, Day Care, gates
- [ ] Trainers faltando (SS Anne, etc.), encounters, marts por cidade, eventos (Magikarp salesman, tutors, Pewter guide, Bike Voucher...)
- Pendente decisão do usuário: des-versionar `local-assets/extracted/*/lz77/` (~8k arquivos, gerado por extract.py; nada em runtime usa)
Próximo: rodar sync-assets + dev server, screenshot de Pewter/Cerulean/PC, commit NPCs/placas.
