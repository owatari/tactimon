# Verification

- `pnpm test`: raiz 79 arquivos/414 testes OK; engine 9 arquivos/215 OK; typecheck client e engine OK.
- Novos: tests/route2.test.ts (packs), tests/gym-leader-parties.test.ts, packages/battle-engine/test/ai-decisions.test.ts (KO, determinismo, 6v6 distinct tiles).
- NÃO feito: screenshots 1365×768/1792×851 de batalha de ginásio (sem mudança de UI; spawn 6v6 coberto por teste de engine).
