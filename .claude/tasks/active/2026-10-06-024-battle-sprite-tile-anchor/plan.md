# Plan — 024 sprite anchor
## Diagnóstico inicial (feito ao criar a task)
Engine: 0 sobreposições de posição em 5064 passos de auto-battle (fuzz de 300 seeds, wild 2v4). Cada unidade é um botão posicionado exatamente no seu tile (FirstBattle.tsx `duel-unit-position`), então o problema é visual: sprites de espécies diferentes têm frame/bounding box/âncora distintos, e os rótulos alternam acima/abaixo, dando impressão de dois Pokémon no mesmo tile.
## Objetivo
Ancorar todo sprite no centro-base do tile (usando bounding box do frame, escala máxima = 1 tile), sombra no tile, rótulo sempre no mesmo lugar; opcional realce do tile ocupado.
## Acceptance
- [ ] Em batalhas 6v10 nenhum sprite invade visualmente tile vizinho; teste visual (screenshots 1365×768 e ~1792×851) com espécies de tamanhos extremos (Onix, Rattata, Dragonite).
- [ ] Teste de lib para o cálculo de âncora/escala; engine ganha invariante de posições únicas em teste.
## Arquivos
components/PokemonBattleSprite.tsx, CSS `.duel-unit*`, metadata de frames.
