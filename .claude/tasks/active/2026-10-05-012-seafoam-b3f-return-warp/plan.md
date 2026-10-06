# Plan — 2026-10-05-012-seafoam-b3f-return-warp

## Objetivo
Lacuna 4 da 009: em Seafoam Islands B3F, o tile (23,9) não tem retorno (risco de soft-lock). Verificar contra a ROM e corrigir.

## Acceptance criteria
- [ ] Reproduzir em teste (`tests/world-reachability.test.ts` ou novo): todo tile alcançável de Seafoam B3F tem rota de volta a uma saída (considerando correnteza/Surf/Strength como na ROM).
- [ ] Correção (warp/obstáculo/corrente) fiel à ROM; sem soft-lock.
- [ ] Teste de regressão verde; typechecks; `pnpm test`.

## Arquivos prováveis
`apps/client/lib/generated/worldWarps.ts`, `worldObstacles.ts`, `tests/world-reachability.test.ts`.

## Riscos
Puzzle de correntes/boulders de Seafoam; Articuno é raid (só aviso).

## Commits
1. `fix: Seafoam B3F return path` (com teste)
