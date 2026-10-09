# Progress — 2026-10-06-039-pokedex-bulbapedia
- [x] Dados: tools/rom-data/generate-tm-compat.py → lib/generated/tmCompat.ts (TM01-50/HM01-08 por espécie, 145 espécies), engine `duelSpeciesBaseStats` + `speciesEvolutions`, lib/pokedexData.ts (locais por inversão das tabelas de encontro land/cave/surf/varas, fontes estáticas à mão, evoluções, learnset, TMs), tests/pokedex-data.test.ts, i18n das fontes estáticas
- [x] lib/bestNature.ts + tests/best-nature.test.ts (heurística: stat ofensivo por base+movepool, +Speed p/ rápidos ≥100, bulky p/ ofensiva fraca)
- Próximo: PokedexWindow.tsx (DOM, abas Info/Locais/Golpes/TMs/Stats, busca, visto/capturado), ligar ao botão do HUD, i18n, e2e, docs
- [x] PokedexWindow.tsx + StartMenu (Classic mode) + css + i18n (62 chaves) + e2e pokedex.e2e.ts 3/3 + walkthrough E3 ajustado (abre o modo clássico) + docs knowledge
