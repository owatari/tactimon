# Sistema de batalha

## Engine — `packages/battle-engine/src/duel.ts` (~7.8k linhas; use `rg -n`)
- Criação: `createWildDuel(WildDuelOptions)`, `createTrainerDuel`, `createStarterDuel`. Opções incluem `seed`, `width`, `height`, `blocked`, `players`, `wilds`/`rivals`.
- Spawn: `pickSpawnPositions` (anchors) → `pickTeamSpawnPositions` → `clusterSpawnPositions`. Helpers `connectedOpenCells`, `largestOpenRegion`, `openNeighborCount`. Regras: maior componente conectado, sem bloqueados, preferir áreas abertas/interior, times em lados opostos, anchors ~4–7 tiles.
- Ações: `applyDuelAction(state, action)` → `{accepted, state, presentation}`; AI: `resolveSimpleAiTurnDetailed`. Alcance: `getReachableCells`. Área: `getDuelMoveAreaTargetIds`.
- Turnos: iniciativa por Speed (`initiative.ts`, `orderByInitiative`). Unidades com `hp <= 0` são ignoradas para turno/alvo/ocupação.
- **Action points (task 026)**: um pool só por Pokémon, `maxAp = 6 + floor(Speed/25)` (`actionCost.ts`, Speed = stat calculado). **Não existe MP**: andar custa 1 AP/tile, golpe custa `apCost` (derivado por fórmula em `apCostForMove`: dano ≈ 10% do poder × hits médios × fator de área, teto 10; status ≈ 3 + efeitos extras/área, teto 6) e a Poké Ball custa 4 AP (`POKE_BALL_AP_COST`). Poder efetivo de OHKO/dano fixo/Future Sight/Solar Beam em `EFFECTIVE_POWER_BY_EFFECT`. A IA reserva AP para atacar depois de andar quando cabe no turno.
- **Captura (task 026)**: `getDuelCaptureEligibility`/`capture.ts` — qualquer selvagem vivo, qualquer HP, várias tentativas; chance Gen III (`fireRedCaptureChance`); sucesso tira o alvo (`captured`, hp 0) e registra em `state.captures[]`, a batalha só acaba quando não restam selvagens; falha mantém o selvagem. Auto Catch (`AUTO_CATCH_HP_RATIO`) continua com seu limiar. EXP da captura = EXP de derrotar × 1,2 (`CAPTURE_EXP_BONUS`), sem EVs. No client: `BattleOutcome.captures[]` → `story.pendingCaptures` (fila) → `CaptureSummary` um por vez + SEND ALL TO BOX.
- Determinismo: `createSeededRandom(seed)`.

## Apresentação — `apps/client/components/FirstBattle.tsx`
- Estado `DuelState` local; anima resultados (`animateResolvedMove`, `animateResolvedItem`), `setUnitAnimation(id, "faint" | ...)`.
- Sprites: `PokemonBattleSprite.tsx` (manifest SpriteCollab runtime). VFX: `BattleVfx.tsx`. Portraits: `PokemonPortrait.tsx`.
- Fim: `onComplete(BattleOutcome)` com HP/status/PP por índice de party, `defeatedEnemies`, `captures`, `won`, `inventory`.
- Fim de batalha: `FirstBattle` chama `onComplete` sozinho ~650 ms após `status: finished` (sem painel interno).
- Pós-batalha (tela única): `GameClient.battleResult` → `BattleResultsScreen` (cabeçalho de `lib/battleResult.ts` `describeBattleResult` + prêmio + EXP/level/golpes por Pokémon) → `PokemonEvolutionOverlay` → `ProgressionOverlay` (golpes pendentes) → whiteout se aplicável.
- Faint: unidade HP 0 some em 260 ms (classe `.fainting` + timer em `FirstBattle`); a engine já a ignora para tile/turno/alvo.
- Arena: o client monta `BattleSceneContext` em `OverworldGame.tsx` (recorte do mapa; `blocked` = colisão, água via `isWaterCell`, fallback 17×9).

## Testes
`packages/battle-engine/test/` — `duel.test.ts` (grande, inclui "battle movement and deployment scale"), `spawn-placement.test.ts`, `capture.test.ts`, `progression.test.ts`, `pewter-gym.test.ts`. Status no client: `tests/*-status.test.ts`.

## Balanceamento (task 008)
- Pack selvagem (`wildEncounters.ts`): soma **por Pokémon vivo da party** a partir do range [min,max] dos slots do mapa — abaixo de min = 1; dentro do range (até max+9) = 1–2; ≥ max+10 = 2; ≥ max+20 = 2–3; teto `MAX_WILD_PACK_SIZE` (10; surf 4).
- Líderes de ginásio (badgeId + mapId `*-gym`) sempre com 6: `fillGymLeaderParty` / `GYM_LEADER_EXTRA_PARTY` em `trainers.ts`; extras dentro do range original e antes do ás (prêmio FireRed usa o último membro). Elite Four/Champion e trainers comuns intactos.
- IA (`duel.ts`): `scoreAiCandidate` agora desconta `aiRetaliationRisk` (dano esperado de quem alcança o tile final; golpe que dá KO remove o alvo do risco). Autobattle do client usa a mesma `resolveSimpleAiTurnDetailed`.
