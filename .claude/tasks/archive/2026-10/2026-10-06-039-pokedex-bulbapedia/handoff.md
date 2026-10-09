# Handoff 039
- Pokédex própria (DOM): lista/busca/filtros, abas Info/Locais/Golpes/TMs/Stats, anti-spoiler visto/capturado, melhor nature; GBA fiel = "Classic mode". Detalhes em knowledge/ui-and-art-direction.md.
- Testar: `pnpm test`; com `pnpm dev`: `pnpm exec vitest run --config tools/e2e/vitest.config.ts pokedex`. `localStorage["tactimon.dex.reveal"]="1"` libera tudo.
- Pendências: fontes estáticas (presentes/prêmios/trocas) são tabela à mão; heurística de nature não otimiza dano real.
