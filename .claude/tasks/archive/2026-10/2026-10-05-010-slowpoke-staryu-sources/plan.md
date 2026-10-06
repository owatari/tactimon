# Plan — 2026-10-05-010-slowpoke-staryu-sources

## Objetivo
Slowpoke(→Slowbro) e Staryu(→Starmie) são inalcançáveis (lacuna 1 da task 009). Dar-lhes fonte fiel ao FireRed/LeafGreen e remover do set `agreed` em `tests/content-integrity.test.ts`.

## Contexto
**Primeiro passo: consultar a tabela de spawn da Bulbapedia (Slowpoke/Staryu, "Game locations", FRLG) e seguir ela** (níveis/taxas/rotas). Se a Bulbapedia indicar apenas fonte fora do escopo (ex.: Sevii), mapear para local Kanto equivalente e registrar em decisions.md.

## Acceptance criteria
- [ ] Fontes (Bulbapedia, FRLG) documentadas em decisions.md com níveis/taxas.
- [ ] Encontros adicionados (grama/água/pesca) preferindo camada de override em `lib/` se `worldEncounters.ts`/`worldWaterEncounters.ts` forem gerados (checar `tools/rom-data`).
- [ ] `slowpoke, slowbro, staryu, starmie` removidos do set `agreed`; teste de obtenabilidade verde.
- [ ] Soma das taxas de cada tabela alterada continua 100%.
- [ ] Pokédex (áreas) reflete as novas fontes.

## Arquivos prováveis
`apps/client/lib/generated/worldEncounters.ts`, `worldWaterEncounters.ts`, `apps/client/lib/` (override), `tests/content-integrity.test.ts`, `tests/water-encounters.test.ts`.

## Riscos
Regenerar arquivos gerados apaga edição manual; Pokédex "áreas" depende das tabelas.

## Testes
`pnpm exec vitest run tests/content-integrity.test.ts tests/water-encounters.test.ts`; typechecks; `pnpm test`.

## Commits
1. `feat: wild sources for Slowpoke and Staryu lines` 2. `test: drop Slowpoke/Staryu from agreed exceptions`
