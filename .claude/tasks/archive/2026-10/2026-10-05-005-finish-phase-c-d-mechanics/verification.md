# Verificação

- `pnpm --filter @tactimon/battle-engine typecheck` ✓ · `pnpm --filter @tactimon/client typecheck` ✓
- `pnpm test`: 71 arquivos / 382 testes (raiz) + 8 arquivos / 211 testes (engine) ✓
- Testes novos: field-mechanics, water-encounters, safari, day-care, game-corner, town-map, in-game-trades, move-tutors, gift-events (extra), world-reachability (Mansion, Cinnabar, elevador), engine kanto-moves.
- Validação visual (Edge headless + playwright-core, dev server em :3000, 1365×768 e 1792×851): Town Map, escuridão do Rock Tunnel, HUD da Safari, Snorlax (diálogo → batalha Lv.30), boulders da Victory Road (empurrar), portas Card Key, guardas de Saffron (com/sem Tea), Safari (pagar → entrar), slots, pesca (F), Cut, Fly via Town Map, elevador Rocket, quiz Cinnabar. Screenshots em scratchpad (fora do Git).
- Bugs achados pela validação: `loadMap` instável (resetava boulders/posição) — corrigido em 23f4a5d6.
- Auditoria de alcance por célula (script temporário): gyms/Mansion/Hideout; achou Cinnabar Gym (quiz) e Rocket Hideout B4F (elevador) inalcançáveis — corrigidos em 28ce54c9.
