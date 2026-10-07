# Plan — 041 Correções de eventos e mundo (lab, Campeão, Viridian Gym, Oak's Parcel, spawn)
## Itens pedidos
1. **Rival do laboratório** (Oak's Lab): batalha inicial do tutorial com Blue — ele deve se comportar como no FireRed (encontro/escolha de inicial, desafio caminhando até o jogador, sair do lugar certo), usar o sistema novo de NPC (`npcBehavior`, `startRivalApproach`) onde fizer sentido, e a fala final.
2. **Campeão (Blue na League)**: ao entrar na sala o Campeão deve andar/virar para o jogador, desafiar, e fazer a fala final (`defeatedText`); hoje fica estático.
3. **Velhinho do Ginásio de Viridian** (e o fluxo do Giovanni/porta): deve ficar **em frente à porta** (bloqueando até as 7 insígnias, como no FireRed) — hoje não está lá; corrigir posição/colisão/diálogo.
4. **Procurar erros semelhantes**: varrer NPCs de gate/bloqueio e eventos de posição em todos os mapas Kanto (guardas de Saffron, Gym guide/old man, Snorlax, Cut tree, Rocket grunts, Silph, Pokémon Tower, SS Anne...), comparando posição/flag/script do jogo com os dados da ROM (`world.json`, `object_events`), e listar/corrigir divergências (relatório em `progress.md`).
5. **Oak's Parcel**: o gatilho deve acontecer (Viridian Mart: o atendente entrega o pacote ao entrar na primeira vez; entregar ao Oak libera Pokédex e Running Shoes na sequência certa) — hoje não dispara.
6. **Spawn de conta nova**: FireRed começa no **quarto do jogador (2º andar da casa em Pallet Town)**; validar o `spawn` inicial (`WORLD_MAPS["pallet-town"].spawn`, `createInitialStory`/save novo) e corrigir para o mapa/tile certo, mantendo o fluxo da primeira batalha com o rival.
## Acceptance
- [ ] Teste de lógica/dados para cada item (posição do velho = tile em frente à porta do ginásio e bloqueia sem 7 insígnias; trigger do parcel; spawn da conta nova).
- [ ] E2E: nova conta nasce no local correto; parcel entregue → Oak; lab rival e Campeão andam até o jogador e falam no fim; velhinho bloqueia a porta de Viridian Gym e libera com insígnias.
- [ ] Relatório de auditoria de NPCs/eventos (divergências encontradas/corrigidas/pendentes).
- [ ] Playthrough 14/14, `pnpm test`, typechecks, walkthrough verdes; knowledge atualizado.
## Arquivos prováveis
apps/client/lib/{trainers,story,maps,questGates,questDialogues,scriptedWorldObjects,dialogueSystem}.ts, components/OverworldGame.tsx, generated/world*.ts, tests/, tools/e2e.
## Riscos
Altera o começo do jogo (playthrough e e2e dependem do spawn atual); eventos de história encadeados; comparação com a ROM exige ler `world.json` dos mapas.
## Ordem de commits
1. `fix: new game spawn` 2. `fix: Oak's Parcel trigger` 3. `fix: Viridian Gym old man at the door` 4. `feat: lab rival and Champion approach + closing lines` 5. `fix: <demais divergências>` 6. `docs`
