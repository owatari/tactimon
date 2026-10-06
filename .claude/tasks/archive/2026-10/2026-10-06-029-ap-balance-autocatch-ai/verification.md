# Verification — 029
- Auditoria (`tests/ap-audit.test.ts`, 4 testes): todo membro de treinador tem golpe usável; < 6% com o golpe mais forte inalcançável (antes 17%); AP médio 6,5–9; espécies Kanto com golpe usável em L5/30/100.
- Engine 259/259: `action-cost.test.ts` (joelho), `ai-autocatch.test.ts` (cenários: status primeiro, dano que não mata, bola em alvo fraco, bola mais barata suficiente, sobrevivência, sem bolas, AP status+bola; estatística 120 seeds com pack ≤ 2× party: **~90% capturados, ~4% mortos**, sem travar), `capture.test.ts` (37 espécies antes incapturáveis — Machop, Onix, Growlithe… — agora com taxa da ROM), `duel.test.ts` (poção 3 AP sem encerrar turno).
- Client typecheck 0; `pnpm test` 93 arquivos/508 testes. `pnpm e2e:walkthrough` verde; `pnpm e2e:playthrough` 14/14 em 4m09.
- Manual (CDP): wild de 4 (Machop, Pidgey, Caterpie, Rattata) com Auto Catch → "4 Pokémon were captured!" em ~13 s a 40×.
