# Plano

**Objetivo:** estabilizar o trabalho local (Running Shoes + spawn tático), corrigir sprites de batalha por metadata, unificar o pós-batalha, remover delay de faint, tutorial do Blue sem whiteout e eliminar teleportes indevidos ao Pokémon Center.

## Acceptance criteria
- [ ] A1 Running Shoes: unlock único na Route 3 com Boulder Badge, persistido (normalize), R toggle, WALK 250ms/RUN ~140ms, bloqueado antes do unlock, HUD WALK/RUN.
- [ ] A2 Spawn: sem blocked/água; maior componente; ambos os times conectados; preferência por área aberta; anchors ~4–7; lados definidos; 6×10 único; `duel.test.ts` deployment scale passa sem alteração.
- [ ] B Sprites: script de auditoria (bbox visível/ocupação/offset/inconsistência entre animações) + correção sistêmica (escala/baseline por metadata); Paras/Zubat ≥ ~1 tile; Onix grande com baseline correta; grid visual inspecionado.
- [ ] C Pós-batalha: uma tela de resultado unificada, compacta, dentro do viewport; evolução separada; sem duplicação.
- [ ] D Faint: unidade morta sai da lógica imediatamente; visual some imediatamente/≤ ~300ms.
- [ ] E Tutorial Blue: derrota → cura total (HP/PP/status), fica no Oak's Lab, progresso continua, sem whiteout/perda de dinheiro; teste vitória e derrota.
- [ ] F Teleportes: causa(s) identificada(s) e documentada(s); respawn consumido uma vez; atualizações de story sem snapshot stale; testes; whiteout legítimo funciona.
- [ ] Typechecks + `pnpm test` verdes; screenshots revisadas; commits semânticos; push sem force; task arquivada.

## Arquivos prováveis
- A: `packages/battle-engine/src/duel.ts` (spawn ~L3000–3320), `apps/client/components/OverworldGame.tsx`, `apps/client/lib/{story,maps}.ts`, `globals.css`, testes novos.
- B: `apps/client/components/PokemonBattleSprite.tsx`, `tools/sprite-importer/build-runtime-assets.mjs`, CSS `.pokemon-battle-sprite*`.
- C: `FirstBattle.tsx` (`.battle-result`), `BattleProgressionSummary.tsx`, `GameClient.tsx`.
- D: `FirstBattle.tsx` (faint animation/`onAnimationComplete`, `sleep`), `PokemonBattleSprite.tsx`.
- E/F: `GameClient.tsx` (whiteout effect, `handleBattleComplete`, `respawnRequest`), `OverworldGame.tsx` (`loadMap`, respawn effect, `onOverworldStep`), `lib/story.ts`.

## Riscos
- Mudança de spawn quebrar outros testes da engine que dependem de posições por seed.
- Mudança de escala de sprite alterar layout de batalha (clipping em tiles vizinhos/HUD).
- Updater funcional de story mudar ordem de atualizações (whiteout por poison).

## Testes
- Engine: `spawn-placement.test.ts`, `duel.test.ts`; novos casos para faint (unidade 0 HP não bloqueia).
- Client: `running-shoes.test.ts`, `battle-spawn-terrain.test.ts`, `whiteout.test.ts` (+ tutorial, respawn), novo teste para resolução de tutorial loss; teste/auditoria de sprite metadata.

## Commits (ordem)
1. `fix: improve battle team spawn placement` (+ water terrain)
2. `feat: add running shoes progression`
3. `fix: keep tutorial loss inside oak lab`
4. `fix: prevent unintended pokemon center respawns`
5. `fix: remove faint disappearance delay`
6. `fix: normalize pokemon battle sprite sizing`
7. `fix: unify post battle results flow`
8. `chore: archive task ...`
