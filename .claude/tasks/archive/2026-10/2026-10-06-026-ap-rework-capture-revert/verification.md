# Verification — 026
- Engine: `action-cost.test.ts` (pool 6+speed/25, fórmula de custo: dano ≈10%, multi-hit, área, status ≈3, tetos, todos os 169 golpes em faixa), `capture.test.ts` (elegibilidade sem gate de HP, chance Gen III), `duel.test.ts` (AP/andar 1 AP/tile, bola 4 AP, captura que não encerra, multi-wild), `ai-ap-fuzz.test.ts` (80 batalhas trainer/wild/Auto Catch sem travar), `ev-system.test.ts` (EXP captura ×1,2, sem EV) → 247/247.
- Client: `capture-choice.test.ts` (fila, SEND ALL, migração do campo antigo), `battle-result.test.ts`, i18n; `pnpm test` 92 arquivos/504 testes. Typecheck client/engine 0 erros.
- E2E: `pnpm e2e:walkthrough` 12/12 (E12 fila + SEND ALL); `pnpm e2e:playthrough` 14/14 em 3m21 (8 ginásios → Campeão com a nova economia de AP).
- UI manual (probe CDP, wild 2 Pokémon, bolas): HUD só com AP, menu "Move: n AP · 1 per tile", bola "4 AP · better odds at low HP", sequência de arremessos → "Choose where each one goes next." → tela de captura "1/2" com "SEND ALL TO BOX (2)". Screenshots 1365×768.
- Não verificado em 1792×851 (mesmo layout, cards são %/min()).
