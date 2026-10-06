# Plan — 2026-10-05-011-version-exclusives-no-exclusivity

## Objetivo
Não haverá exclusividade de versão: implementar os Pokémon exclusivos de LeafGreen (e os que só aparecem em Sevii, como Ponyta/Rapidash) com spawns conforme a tabela da **Bulbapedia** (FRLG). O usuário citou: Growlithe é exclusivo de uma versão e Rapidash/Ponyta de outra — ambos devem spawnar aqui.

## Escopo
Set `agreed` atual em `tests/content-integrity.test.ts`: `sandshrew, sandslash, vulpix, ninetales, bellsprout, weepinbell, victreebel, magmar, pinsir, ponyta, rapidash`, mais qualquer outro exclusivo FR/LG detectado (ex.: Growlithe/Arcanine, Ekans/Arbok, Oddish line, Mankey, Scyther, Electabuzz...). Levantar a lista completa pela Bulbapedia (FR vs LG) e comparar com `GENERATED_LAND_ENCOUNTERS`.

## Acceptance criteria
- [ ] Lista final "espécie → rota/mapa → níveis → taxa" em decisions.md (fonte Bulbapedia FRLG; onde só existe em Sevii, mapear para rota Kanto equivalente e registrar).
- [ ] Todas as espécies acima obteníveis em estado selvagem; espécies existentes não removidas; soma de slots = 100%.
- [ ] Set `agreed` reduzido a lendários/míticos (raids) — teste de obtenabilidade verde.
- [ ] Packs selvagens/balanceamento (task 008) e testes de spawn continuam verdes.
- [ ] Pokédex lista as novas áreas; i18n sem textos faltantes.

## Arquivos prováveis
`apps/client/lib/generated/worldEncounters.ts` (checar gerador em `tools/rom-data`; preferir override em `lib/`), `tests/content-integrity.test.ts`, `tests/kanto-data.test.ts`.

## Riscos
Slots mudam dificuldade das rotas; arquivos gerados podem ser sobrescritos; interação pack size vs tabelas.

## Testes
`pnpm exec vitest run tests/content-integrity.test.ts tests/kanto-data.test.ts`; typechecks; `pnpm test`.

## Commits
1. `feat: spawn version-exclusive Pokémon per Bulbapedia FRLG tables` 2. `test: restrict agreed unobtainable set to raid legendaries`
