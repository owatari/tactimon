# Plano — Fase D: conteúdo Kanto restante (Saffron → League) + espécies 1–151

## Fundação feita
`tools/rom-data/extract-kanto-data.py` gera `packages/game-data/data/kanto-species.json` (151 espécies: base stats, tipos, catch rate, EV yield, growth, evoluções, learnset) e `kanto-moves.json` (353 golpes: tipo, poder, precisão, PP, efeito, alvo). Teste `tests/kanto-data.test.ts` confere que as espécies já no engine batem com a ROM.

## Etapas
1. **Gerador engine** `tools/rom-data/generate-engine-species.py`: emitir espécies faltantes (≈100) em TS (SPECIES/INITIAL_MOVES/learnsets/EV/exp/growth) + registrar sprites (`tools/sprite-importer/build-runtime-assets.mjs`) + Pokédex ids.
2. **Golpes**: portar ~75 golpes que faltam. Atacantes simples (dano + tipo) saem do JSON com `apCost`/`range`/`motion` heurísticos e vfx genérico; golpes com efeito especial (status, multi-hit, charge, OHKO…) um a um com teste.
3. **Mapas**: Route 7–25 restantes, Lavender, Celadon, Saffron, Fuchsia, Cinnabar, Pallet-Viridian loop, Route 10–23, Rock Tunnel, Pokémon Tower, Silph Co, Safari Zone, Seafoam, Mansion, Victory Road, League. Pipeline já existente: `sync-assets` + `generatedWarps` (generalizar o script de interiores para qualquer mapa).
4. **Conteúdo**: NPCs/placas (`worldTexts`), trainers (extração `gTrainers`), gym leaders + badges, encounters (extração `gWildMonHeaders`), marts, itens/ocultos (`overworldPickups`), eventos de história (Pokémon Tower, Silph Co, Snorlax, Rocket…).
5. **HMs/Key items** de campo e gates (guardas de Saffron, Cycling Road…).

## Riscos
Escala (≈200 mapas, ≈300 trainers, ≈75 golpes); validação visual indisponível nas sessões até aqui; engine tática exige AP/range por golpe.
