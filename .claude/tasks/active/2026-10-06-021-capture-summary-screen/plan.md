# Plan — 021 capture summary
## Objetivo
Substituir o cry pós-captura por uma tela no padrão da UI (FireRed/ROM, como Summary): portrait do Pokémon, stats, IVs, EVs (se houver), nature com stat que sobe/desce, campo de apelido (max 10), botões SEND TO TEAM / SEND TO BOX. Depende da task 020.
## Acceptance
- [ ] Após captura bem-sucedida abre a tela (sem cry); apelido salvo no Pokémon (`nickname`), exibido em party/box/batalha.
- [ ] Party cheia: SEND TO TEAM abre troca (escolher quem vai pro box) ou fica desabilitado com aviso; SEND TO BOX deposita.
- [ ] i18n 5 idiomas; teclado/gamepad; screenshots 1365×768 e ~1792×851.
- [ ] Lógica (nickname/envio) em lib/ com testes.
## Arquivos
components/GameClient.tsx (fluxo pós-batalha), novo componente, lib/story.ts (nickname), i18n catalog, StartMenu/FirstBattle (exibir apelido).
## Riscos
Fluxo de captura hoje passa por BattleResults + registro da Pokédex; definir ordem (captura → tela → registro Pokédex).
