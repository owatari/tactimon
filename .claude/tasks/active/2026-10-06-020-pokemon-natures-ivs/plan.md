# Plan — 020 natures/IVs
## Objetivo
Hoje só EVs existem (progression.ts). Modelar nature (25, +10%/-10% em um stat), IVs (0–31 por stat) e (opcional) habilidade/local de captura em `PokemonProgression`/`CapturedPokemon`, com normalização compatível com saves antigos (gerar valores determinísticos a partir de species+level para Pokémon antigos).
## Acceptance
- [ ] Nature e IVs sorteados na criação (wild, trainer fixos/derivados, captura) e usados nas fórmulas de stat (HP/ATK/DEF/SPA/SPD/SPE) do engine, FireRed-fiel.
- [ ] Saves antigos normalizam sem perder dados; testes de round-trip.
- [ ] Nomes/efeitos de nature em i18n (5 idiomas); Summary mostra nature (+/-).
## Arquivos
packages/battle-engine/src/{progression,duel}.ts, apps/client/lib/story.ts, i18n catalog, tests.
## Riscos
Mexe no cálculo de stats: reequilibra batalhas; rodar `pnpm e2e:playthrough` após. Decidir se IV/nature de treinadores é fixo (FireRed: personalidade aleatória).
