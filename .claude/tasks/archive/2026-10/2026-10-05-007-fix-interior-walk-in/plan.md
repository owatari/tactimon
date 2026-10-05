# Plan — 2026-10-05-007-fix-interior-walk-in

## Objetivo
Validar por que entrar em interiores andando (walk-in nas portas) deixou de funcionar no overworld e corrigir a causa raiz, com teste de regressão.

## Investigação já feita (base_head a96f3155)
- `tests/world-reachability.test.ts` passa (5/5): tabelas de warps (`generatedWarps.ts`, `generated/worldWarps.ts`, hand-written em `maps.ts:resolveWarpTransitionAt`) estão consistentes ao nível de dados → suspeita é de **runtime/UI**, não de dados.
- Caminho do walk-in em `OverworldGame.tsx`: tentativa de passo (~L2119 `resolveWarpTransitionAt` → `pendingWarpRef`, ~L2147) → fim do passo (~L2616) consome `pendingWarp` e chama `loadMap`. Há `return` antecipado antes do warp: `endSafariGame`, `!storyHasHealthyPokemon`.
- Commits recentes tocando o overworld: `148bfb10` (migração i18n), `b605b4b7`, `23f4a5d6` (loadMap estável), `28ce54c9` (warp dialogue requests), `10f04d2b`. Task 006 (polish) é a mais recente → provável regressão ali (ex.: gates/`questGates`, `hmParty`, estado de input, i18n quebrando lookup de mapa, `loadMap` token anti-race, ou `canWalk`/tile gate bloqueando célula da porta).

## Passos
1. Reproduzir: `pnpm dev`, andar até a porta de uma casa (Pallet Town) e de um Pokémon Center; anotar se o passo é bloqueado (blockedUntil) ou se o warp não dispara/`loadMap` falha. Checar console.
2. Bisect: `git log` + `git stash`-free (usar `git worktree`/checkout temporário NÃO; usar `git show <sha>:arquivo` ou diff por commit) nos arquivos `OverworldGame.tsx`, `maps.ts`, `questGates.ts`, `generatedWarps.ts`, `generated/worldMaps.ts` desde a task 005 para achar o commit que quebrou.
3. Escrever teste falhando que reproduza (vitest raiz; extrair lógica pura se necessário, ex.: "passo para célula de porta resolve warp e é walkable/aceito pelo gate").
4. Corrigir a causa raiz; sem workaround.
5. Validar manualmente (screenshots 1365×768 e ~1792×851): entrar e sair de ≥3 interiores (casa, Center, Mart/Gym) e de um mapa gerado (`<tipo>-<n>`).

## Acceptance criteria
- [ ] Causa raiz identificada e registrada em `decisions.md` (commit/arquivo/linha).
- [ ] Andar até a porta de um interior (ex.: Pallet Town casa do player, Viridian Pokémon Center, Pewter Gym) carrega o interior, e sair pela porta interna volta ao exterior no ponto correto.
- [ ] Interiores gerados da ROM (ex.: `cerulean-house-3`, `ss-anne-2f-room-4`) também acessíveis.
- [ ] Teste de regressão novo falha antes da correção e passa depois.
- [ ] `tests/world-reachability.test.ts` continua passando.
- [ ] Typechecks (engine + client) e `pnpm test` sem falhas novas.
- [ ] Screenshots de entrada/saída validadas.

## Arquivos prováveis
`apps/client/components/OverworldGame.tsx`, `apps/client/lib/maps.ts`, `lib/questGates.ts`, `lib/generatedWarps.ts`, `lib/generated/worldWarps.ts`, novo teste em `tests/`.

## Riscos
- Regressão pode ser só de runtime (não coberta por teste atual) → pode exigir extrair função pura para testar.
- Não versionar `local-assets/**`, `next-env.d.ts`, `.next/`; staging por arquivo.
- Se a correção tocar texto de jogo: i18n nos 5 idiomas (`tests/i18n.test.ts`).

## Testes necessários
`pnpm exec vitest run tests/world-reachability.test.ts` + novo teste; `pnpm test`; typechecks engine/client.

## Ordem de commits
1. `test: cover interior walk-in warp regression` (pode ir junto com o fix se pequeno)
2. `fix: restore interior walk-in warps`
3. `chore: archive task 2026-10-05-007-fix-interior-walk-in`
