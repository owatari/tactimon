# Plan — 039 Pokédex própria (informações estilo Bulbapedia)
## Estado atual (investigado)
Pokédex = canvas GBA fiel à ROM (`PokedexGba.tsx`, `lib/gba/dexRender.ts`) com lista, páginas de área/descrição e cry. Dados que já temos: `lib/generated/pokedexEntries.ts`, encontros (`wildEncounters.ts`, `waterEncounters.ts`, `generated/world*Encounters`), learnsets (`POKEMON_LEARNSETS`, task 034), compatibilidade de HM (`generated/hmCompat.ts`), stats base (`kanto-species.json`), evoluções.
## Objetivo
Uma Pokédex nossa (DOM, padrão visual do jogo), acessada pelo botão do HUD, com por espécie: **onde aparece** (mapas, método grama/água/pesca/estático, níveis e % — usando as tabelas reais e `appearanceRate`), **learnset completo** (nível → golpe, com tipo/poder/AP), **TMs/HMs que aprende** (extrair `gTMHMLearnsets` completo, não só HM), **melhor nature** (calculada: stat ofensivo dominante pelos stats base e golpes; derruba o ofensivo não usado; tabela explicável), stats base com barras, tipos (ícones), evoluções, altura/peso/descrição da ROM, IV/EV yield, taxa de captura, raridade. Estados vistos/capturados (info bloqueada como "???" até ser registrada/capturada, com opção de revelar tudo para testes).
## Acceptance
- [ ] Dados gerados reproduzíveis (`tools/rom-data`): TMs por espécie, localização por espécie (inverso das tabelas de encontro, incluindo static/surf/fishing/gift).
- [ ] Função pura `bestNatureFor(species)` + testes (ex.: Alakazam → Modest/Timid; Machamp → Adamant); explicação ("+Sp. Atk −Atk").
- [ ] Tela com busca/filtro, lista rolável, painel de detalhes com abas (Info, Locais, Golpes, TMs, Stats), navegável por mouse/teclado/controle; hover/click; i18n 5 idiomas; screenshots; e2e abre a Pokédex e navega.
- [ ] A Pokédex GBA fiel pode ficar como "Modo clássico" (opcional) ou ser removida; decidir em `decisions.md`.
## Arquivos prováveis
apps/client/components/PokedexWindow.tsx (novo), lib/pokedexData.ts, lib/bestNature.ts, tools/rom-data/generate-*.py, generated/*, tests/, tools/e2e.
## Riscos
Escopo de dados (TMs/locais); fidelidade da "melhor nature" (heurística documentada); desempenho com 151 entradas; spoilers de localização (respeitar visto/capturado).
## Ordem de commits
1. `feat: pokédex data (TM compatibility, locations)` 2. `feat: best nature calculator` 3. `feat: pokédex window` 4. `docs`
