# Decisions — 2026-10-06-041-world-event-fixes
- Spawn: FireRed new-game warp = player's bedroom 2F (6,6); constante NEW_GAME_START em maps.ts, usada quando nao ha starter/save.
- Oak's Parcel: o balconista so entregava ao interagir; agora entra no Viridian Mart pela primeira vez (sem Pokedex e sem parcel) e o dialogo dispara sozinho (como no FireRed).
- Velhinho do Viridian Gym: ROM OLD_MAN_1 (local_id 3) esta em (34,11); override em lib/npcOverrides.ts coloca em (36,11) (frente da porta 36,10) enquanto faltarem as 6 insignias; textos continuam indexados pelo tile da ROM (homeX/homeY).
- Rival do lab agora anda ate o jogador (NPC story-rival no NpcEngine) e fala antes da batalha; fala final neutra (a batalha tutorial nao tem vitoria/derrota registrada). Campeao: sightRange 4 (antes 0, nunca notava ninguem), vira, mostra ! e desafia sem sair do lugar; fala final = defeatedText.
- Auditoria: posicoes de dialogos autorais e treinadores batem com os objetos da ROM (0 divergencias); 'scripted' sem objeto ROM sao eventos de fundo (slots, itens escondidos, interruptores, quiz). Erros semelhantes nao automatizaveis (semantica de scripts) ficam como pendencia.
