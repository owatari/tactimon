# Plan — 036 NPCs e eventos como no FireRed
## Estado atual (a investigar no início da execução)
Ler `.claude/knowledge/overworld-and-story.md`; `OVERWORLD_TRAINERS` (`lib/trainers.ts`, `sightRange`, `facing`), `OverworldGame.tsx` (trigger de visão, `fightTrainer`), eventos de rival (Route 22, Cerulean, SS Anne: `*RivalEncounter`, `is*TriggerTile`), dados gerados de NPCs (`lib/generated/world*.ts`, tipos de movimento da ROM `MOVEMENT_TYPE_*`). Mapear o que existe (parado/olhando) contra o que falta (andar até o jogador, diálogo pós-batalha, movimentos de NPC).
## Objetivo
1. **Treinador te vê** (linha de visão `sightRange` na direção em que está virado): exclamação "!", congela o jogador, **vira para o jogador se preciso**, **anda até ficar adjacente**, diálogo de desafio, batalha, **diálogo de derrota/finalização** (se existir), devolve o controle. Respeita obstáculos e outros NPCs.
2. **Rival** nos pontos de encontro (Pallet / Route 22 / Cerulean / SS Anne / …): anda até o jogador como no FireRed, diálogo, batalha, saída.
3. **Comportamentos de NPC da ROM** respeitados: girar/olhar em direções, andar em padrões ou aleatório dentro de um raio, andar fixo cima/baixo ou esquerda/direita, seguir o jogador (quando houver), ficar parado de costas etc. (usar `movementType`/`movementRange` extraídos dos mapas; ver tools/rom-data).
4. NPCs de história (Oak, Mom, guardas de portão, Snorlax…) com eventos disparados corretamente e uma única vez.
## Acceptance
- [ ] Teste de lógica pura: dado mapa, posição do jogador e treinador, resolve `spotted` (linha de visão, bloqueios), o caminho até o jogador (BFS) e a sequência de estados (spot → turn → walk → dialogue → battle → afterDialogue).
- [ ] Tabela de comportamentos de NPC (tipo de movimento da ROM → comportamento implementado) com cobertura: nenhum tipo usado em mapa Kanto fica "estático por omissão" sem registro.
- [ ] E2E: ser visto por um treinador (Route 3 ou Viridian Forest) → ele anda até mim → batalha → diálogo final; rival da Route 22 anda até mim.
- [ ] Sem regressão no playthrough 14/14 (ajustar hooks e2e se preciso).
- [ ] Knowledge `overworld-and-story.md` atualizado com a máquina de estados e a tabela de comportamentos.
## Arquivos prováveis
apps/client/components/OverworldGame.tsx, lib/trainers.ts, lib/npcBehavior.ts (novo), generated/world*.ts (se faltar dado), tools/rom-data/*, tests/, tools/e2e.
## Riscos
Grande; dividir em 2 execuções se necessário (1: treinadores + rival; 2: comportamentos ambientes). Dados de movimento podem não estar extraídos; pathfinding com NPCs em movimento; tempo/animação em e2e turbo.
## Ordem de commits
1. `feat: trainer sight state machine (turn, walk, battle, after-dialogue)` 2. `feat: rival encounters walk to the player` 3. `feat: ROM NPC movement behaviors` 4. `docs`
