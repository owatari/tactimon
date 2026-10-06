# Plan — 022 follower
## Objetivo
No overworld o primeiro Pokémon vivo da party anda atrás do jogador (trilha de posições do jogador, 1 tile de atraso), usando a sprite de batalha (pokemon-sprites, frames de walk/idle) escalada ao tile.
## Acceptance
- [ ] Segue em andar/correr/bike/surf (no surf fica oculto ou na água), sem bloquear o jogador (troca de lugar ao colidir), some em interiores onde não couber e em warps reaparece atrás do jogador.
- [ ] Respeita colisão (nunca fica em tile bloqueado), cutscenes/diálogos e whiteout; muda ao reordenar a party; oculto se desmaiado.
- [ ] Interagir com ele mostra o grito/emote simples (opcional).
- [ ] Teste de lib (trilha/posição), screenshots, sem regressão no `pnpm e2e:walkthrough`.
## Arquivos
components/OverworldGame.tsx (render/loop), lib/ novo `follower.ts`, PokemonBattleSprite metadata (frames).
## Riscos
Custo de render/canvas; sprites de batalha têm frame/âncora variáveis (ver task 024); NPC blocking e warps.
