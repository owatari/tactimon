# Plan — 023 shiny
## Contexto
Hoje NÃO existem shinies no projeto (só o ícone shiny_star da ROM extraído). Sem chance, flag ou sprite alternativa.
## Objetivo
Adicionar `shiny` ao Pokémon (selvagens e capturados; ovos/trocas herdam), com chance de spawn configurável. Proposta: 1/8192 (FireRed) como padrão; alternativa 1/4096 (Gen VI+). Decidir com o produto.
## Acceptance
- [ ] Flag `shiny` no modelo/save (normalização compatível), sorteio por encontro, sem afetar stats.
- [ ] Sprite shiny (paleta alternativa do SpriteCollab/PMD ou recolor) em batalha, party, box, Pokédex e follower; estrela shiny no Summary (asset da ROM já extraído).
- [ ] Chance como constante testada; i18n; documentado em knowledge.
## Riscos
Disponibilidade de paletas shiny nos assets; tamanho dos assets.
