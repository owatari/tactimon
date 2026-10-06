# Verification — 020
- Engine: `personality.test.ts` (natures, IVs, stats, progressão, selvagem semeado) → `pnpm --filter @tactimon/battle-engine exec vitest run` 223/223.
- Client: `tests/personality-client.test.tsx` (inicial, save round-trip, save antigo, presentes, nomes em 5 idiomas, Summary info/skills).
- Typecheck client/engine: 0 erros. `pnpm test`: 89 arquivos/480 testes + engine 223.
- Screenshots 1365×768 (Summary INFO com "Adamant +ATTACK −SP. ATK") e 1792×851 (SKILLS com ATTACK vermelho, SP. ATK azul).
- Playthrough e2e não precisa rerodar: o teste usa progressões sem personalidade (stats idênticos); trainers também.
