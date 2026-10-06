# Verification — 015

## Comandos
- `pnpm exec vitest run tests/walkthrough.test.ts` → 19/19
- `pnpm e2e:walkthrough` (dev server :3000, Edge headless/CDP) → 7/7
- `pnpm --filter @tactimon/client typecheck` → 0 erros
- `pnpm test` → 87 arquivos / 471 testes + engine 215, tudo verde

## Relatório por etapa
Lógica (vitest): 1 inicial/rival/¥3000 OK · 2 rival tutorial OK · 3 gate Pallet→Route 1 e sem Pokédex OK · 4 Oak's Parcel→Pokédex OK · 5 Mart OK · 6 capturas party/PC + registro Pokédex OK · 7 depósito/saque PC OK · 8 XP/evolução por pedra OK · 9 troca in-game OK · 10 Day Care OK · 11 Game Corner OK · 12 whiteout OK · 13 8 líderes 6v6 OK · 14 Viridian Gym lock/unlock OK · 15 HMs por insígnia+party OK · 16 Campeão/estrela/HoF OK · 17 save/load OK · 18 save antigo OK · 19 idiomas OK.
E2E (browser): E1 boot · E2 menu sem/com Pokédex · E3 Pokédex ROM canvas · E4 cartão/Summary move · E5 15 mapas sem exceções · E6 idioma pt · E7 whiteout carrega. Todos OK.
Bugs encontrados: nenhum no jogo (falhas iniciais eram premissas erradas do script: rival, gate y=10, idioma do SO, erros acumulados entre testes).
Screenshots 1365×768 em scratchpad (não versionados).

## Fora de escopo / limite
E2E não joga batalhas por input (RNG/timing de canvas); gates de Safari/Silph/Cycling Road cobertos por `world-reachability`/testes existentes.
