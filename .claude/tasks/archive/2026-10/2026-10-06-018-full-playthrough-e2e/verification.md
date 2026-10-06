# Verification — 018
- `pnpm e2e:playthrough` → 14/14 em 4m35s: gym-boulder…gym-earth (9–32s cada), e4-lorelei/bruno/agatha/lance, champion, hall-of-fame. Screenshot final: Campeão derrotado, sala da Liga carregada.
- `pnpm e2e:walkthrough` → 7/7 (refatorado para `tools/e2e/cdp.ts`).
- `pnpm exec vitest run tests/e2e-mode.test.ts` → 4/4. Typecheck client: 0 erros. `pnpm test`: 88 arquivos/475 testes + engine 215, verde.
- Diagnóstico das falhas durante o desenvolvimento (não eram bugs do jogo): timers de 1–25 ms estrangulados no Edge headless (flags anti-throttling), screenshot/Enter durante a batalha, jogo regravando o save ao descarregar a página, execuções simultâneas. Engine: fuzz de auto-battle (Surge/Misty/Erika, 60–400 seeds) sem travamentos.
- Limites: party nivelada por etapa (líder+8) e restaurada antes de cada luta; inicial/Parcel/Pokédex semeados (cobertos pela camada lógica da 015).
