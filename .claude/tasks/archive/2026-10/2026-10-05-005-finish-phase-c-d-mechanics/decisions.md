# Decisões

- Esta task consolida os pendentes de C (002) e D (003); ao concluir, ambas são arquivadas. E (004) permanece planned.
- Tabelas da ROM são a fonte da verdade (trocas `0x26CF8C`, rotina da Mansion `0x1A7B7A`, quiz da Cinnabar, Silph Giovanni = trainer 349); só o TS gerado é versionado.
- Portas/barreiras fechadas viram células andáveis (`QUEST_OPEN_CELLS`) + tile gate: não precisa trocar metatiles em runtime.
- Cinnabar quiz: resposta errada só mantém a porta fechada (sem batalha forçada); Safari/Game Corner usam regras simplificadas (sem bait/rock; slots 83% RTP).
- Oak's Parcel não foi implementado: a Pokédex já existe desde a fase B. Guia de Pewter e Rock Smash/Waterfall/Sevii/Cycling Road ficam fora (não são pré-requisito de progressão).
- Boulders: posição em `choices["boulder:<id>"]`, reset a cada `loadMap` (como o FireRed).
- Learnsets: corrigido bug antigo de off-by-one na extração (afetava as 93 espécies geradas e movesets de trainers).
