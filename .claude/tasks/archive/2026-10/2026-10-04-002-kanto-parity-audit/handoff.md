# Handoff — 2026-10-04-002-kanto-parity-audit (arquivada; validação visual pendente)

Feito: limpeza + lockfile; 46 itens/ocultos (bagItems); world.json + NPCs/placas pt-BR em todos os mapas; 42 interiores com warps gerados da ROM; +19 trainers (SS Anne, Mt. Moon, Pewter Gym) e Tentacool/Ponyta; estoque de Mart por cidade. Knowledge atualizado em `overworld-and-story.md`.

Pendente:
1. **Validação visual** (1365×768 e ~1792×851): sem browser na sessão. Testar `pnpm dev` (rodar `node apps/client/scripts/sync-assets.mjs` antes): entrar nas casas/Museum/SS Anne, ler placas, hidden items, comprar em cada Mart.
2. Eventos que exigem sistemas novos: Bike/Fan Club, Old Rod, Magikarp, Daisy/Town Map, Mom, Day Care, tutors Route 4, Old Amber, trades, Pewter guide.
3. Uso em batalha/campo dos itens de `bagItems` (Antidote, Revive, Repel, Escape Rope…).
4. Gates (Route 2 East, Route 5 S, Route 6 N, Route 22 N), PC 2F, Viridian Gym.
5. Decisão: des-versionar `local-assets/extracted/*/lz77/` (~8k arquivos).
