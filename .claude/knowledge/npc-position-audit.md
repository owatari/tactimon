# Auditoria de NPCs que mudam de posição (ROM FireRed)

Ferramentas: `tools/rom-data/fr_script.py` (percorre os scripts de evento a partir dos pontos de entrada de cada mapa: objetos, coord events, bg events e tabelas de map scripts; segue `call/goto/call_if/goto_if`) e `tools/rom-data/scan-npc-moves.py` (relatório). Rodar: `python tools/rom-data/scan-npc-moves.py [--json out.json] [mapa ...]` (precisa da ROM local e dos `world.json` extraídos). Cobertura: ~3130 scripts percorridos; só 32 caminhos pararam em opcodes desconhecidos (0xD0 e dois raros) — a leitura é confiável, mas não é um desassemblador completo (`trainerbattle` interrompe o caminho).

## O que a ROM faz com NPCs
- **`setobjectxy` / `setobjectxyperm`** (teleporte de NPC): só em 9 mapas — Oak Lab (Blue/Oak durante a cena do rival), Cerulean (Blue), Route 22 (Blue), Pallet (Oak), Rival's House (Daisy), Saffron Fan Club (todos os fãs se reorganizam), Sea Cottage (Bill), Indigo Plateau PC. São posições de **cena**.
- **`applymovement` que anda um NPC**: rivais (Blue em Oak Lab, Cerulean, Route 22, Pokémon Tower, Silph Co, SS Anne), Oak (Pallet, Oak Lab, Champion), Bill (Cinnabar, Sea Cottage), Giovanni (Silph), guias do Pewter, quiz do Cinnabar Gym, Route 24, Mt. Moon B2F.
- **Posição mantida depois do passo (`copyobjectxytoperm`)**: Mt. Moon B2F (cientista pega o outro fóssil — **corrigido**: `npcOverrides.ts`), Pallet (mulher que vagueia), Route 24.
- **Objetos com `flag_id`**: a ROM os usa como "flag de ocultar": o NPC aparece quando a flag está limpa. São 104 NPCs de evento (guardas Rocket de Saffron/Celadon/Silph/Hideout/Tower, civis de Saffron, Mr. Fuji, Blue/Oak das cenas, Bill, Snorlax/aves...). **Nenhum tem texto/script curado** no jogo, então não são renderizados (regra "NPC da ROM só aparece com texto"); o comportamento deles vive em camadas autorais (treinadores, `questGates`, `scriptedWorldObjects`, cenas de rival do `OverworldGame`).

## Correções feitas por causa desta auditoria
- Velhinho do Viridian Gym na frente da porta enquanto faltarem as 6 insígnias (a ROM o deixa em (34,11); `NPC_POSITION_OVERRIDES`).
- Cientista do Mt. Moon B2F vai para o fóssil que sobrou (helix → (14,8), dome → (13,8)).
- Rival do laboratório anda até o jogador; Campeão nota o jogador (sightRange 4) — task 041.
- Comportamentos de movimento (olhar, vaguear, patrulha) — task 036 (`npcBehavior.ts`).

## Pendências conhecidas
- Saffron Fan Club: a ROM reorganiza os fãs após falar com o presidente (posições em `scan-npc-moves.py`); hoje ficam parados.
- Sea Cottage (Bill/Clefairy), Pewter (guia do ginásio, museu), Route 24 (homem da ponte), quiz do Cinnabar Gym, Silph/Hideout/Tower (Rockets visíveis até limpar): precisam de textos curados + regras de visibilidade por evento antes de renderizar.
- Tipos de movimento sem implementação em `UNIMPLEMENTED_MOVEMENT_TYPES`.
