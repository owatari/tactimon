# Decisões

- Escopo de auditoria = todos os mapas já em `WORLD_MAPS` (até Vermilion/SS Anne), não só até Cerulean, porque o código já os inclui.
- TMs e Held Items do FireRed no overworld não são adicionados (exclusivos de dungeon/raid); cada caso fica listado aqui como exceção.
- Eventos/itens/obstáculos são por player (`playerWorldState`), não globais.
- Des-versionar `local-assets/extracted/**` exige confirmação explícita do usuário.
- Itens fora do engine (Antidote, Revive, Repel…) vão para `bagItems` e podem ser comprados/coletados; uso em batalha/campo fica para a task do sistema de bolsa.
- Só renderizo NPCs da ROM com texto curado (pt-BR) para não duplicar trainers/clerks/story NPCs; NPCs de evento (Mom, Daisy, Fishing Guru, Magikarp, Fan Club, tutors, Day Care) adiados: dependem de mecânicas inexistentes (Bike, Old Rod, Pokédex, tutors).
- Warps novos gerados da ROM em `generatedWarps.ts`; gates (Route 2 East, Route 5 S, Route 6 N, Route 22 N) e PC 2F ficam de fora.
- Tentacool/Ponyta adicionados ao engine só para os trainers do S.S. Anne (golpes acid/constrict inexistentes: usei poison-sting/supersonic/wrap).
