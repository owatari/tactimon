# Testes

- Raiz: `pnpm test` = `vitest run tests && pnpm -r test` (engine).
- `tests/*.test.ts` importam diretamente `apps/client/lib/*` (funções puras). Um arquivo por feature/área de mapa (ex.: `route3.test.ts`, `whiteout.test.ts`, `story-persistence.test.ts`).
- Engine: `packages/battle-engine/test/*.test.ts` importam de `../src`.
- Direcionado:
  - `pnpm exec vitest run tests/whiteout.test.ts`
  - `pnpm --filter @tactimon/battle-engine exec vitest run test/spawn-placement.test.ts -t "6x10"`
- Typecheck: `pnpm --filter @tactimon/battle-engine typecheck`, `pnpm --filter @tactimon/client typecheck` (client typecheck cobre componentes React; não há testes de componente).
- Não há lint configurado. Build (`pnpm build`) depende de assets locais (sync) — só quando necessário.
- Componentes React não têm testes unitários: extraia a lógica para `lib/` e teste lá; valide UI por screenshot.
