# Plan — 042 Resolver todas as pendências de NPC
Fonte: `.claude/knowledge/npc-position-audit.md` (task anterior). Objetivo: cada grupo de NPC da ROM tem tratamento no jogo ou justificativa explícita de "fora do jogo".
## Escopo
NPCs de evento com hide flag (Saffron, Celadon, Cerulean Cave, Vermilion, Pewter, pós-jogo, Fan Club), posições que mudam, cenas (Oak em Pallet, guia de Pewter, auxiliar dos Running Shoes, Oak no Campeão, quiz do Cinnabar), tipos de movimento restantes.
## Acceptance
- [x] `eventNpcs.ts` + catálogo 4 idiomas; renderização por flag; reconstrução ao mudar a história.
- [x] Fan Club, Mt. Moon, Viridian Gym por override de posição.
- [x] Cenas: Oak/Pallet, guia/Pewter, auxiliar, Oak/Campeão, quiz/Cinnabar com luta forçada.
- [x] Todos os tipos de movimento da ROM cobertos (comportamento ou parado de propósito) com teste.
- [x] Testes de lib + E2E (E23–E26) + playthrough 14/14.
