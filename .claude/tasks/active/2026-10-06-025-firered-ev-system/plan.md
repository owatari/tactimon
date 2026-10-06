# Plan — 025 EVs estilo FireRed
## Objetivo
Abandonar os EVs automáticos por level-up (ciclos por espécie, 6 EVs/nível). Adotar Gen III/FireRed: cada Pokémon derrotado dá o EV yield da sua espécie (dados da ROM em `packages/game-data/data/kanto-species.json`) a todos os participantes; teto 252/stat e 510 total; vitaminas (HP Up, Protein, Iron, Calcium, Zinc, Carbos) dão +10 EV até 100 no stat (já existem no Mart de Celadon e no Bag, sem efeito).
## Acceptance
- [ ] `generated/evYield.ts` gerado por script a partir da ROM; sem `AUTO_EV_CYCLES`/`EV_PER_LEVEL`.
- [ ] Derrotar selvagem/treinador aplica o yield (captura não dá EV); caps respeitados; `evGained` continua alimentando a UI pós-batalha.
- [ ] Vitaminas usáveis no Bag/party (+10, máx. 100 por stat, respeita 510); mensagens i18n.
- [ ] Testes engine + client; saves antigos intactos (EVs já ganhos permanecem).
## Arquivos
packages/battle-engine/src/progression.ts, generated/{kanto,evYield}.ts, tools/rom-data/*, apps/client/lib/itemUse.ts, items.ts, GameClient.tsx, i18n catalog, tests.
