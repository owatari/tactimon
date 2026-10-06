# Plan — 026 AP rework + reverter captura

## Estado atual (investigado)
- AP: `ap/maxAp` por unidade, `maxAp` fixo 6 (`makeUnit`), `apCost` escrito à mão em cada golpe (2–5, `duel.ts` ~1700+). Movimento usa **MP separado** (`movementPointsForDuelPokemon`: 2–5 por faixa de speed base, `reachableCellsWithCosts` limita por `unit.mp`).
- Captura: Poké Ball só com HP ≤ 50% (`getCaptureEligibility`, `captureHpThresholdRatio: 0.5`), só com **um** selvagem vivo (`multiple-wilds`), uma tentativa por alvo (`captureAttempted`), **a tentativa encerra a batalha** (`state.status = "finished"`), XP parcial na falha (`failedCaptureXpRatio`), Auto Catch (`AUTO_CATCH_HP_RATIO = 0.3`). Histórico: `87f29846 feat: add wild Pokémon capture loop`, gating multi-wild em `1c47109a`/`ebf0d9cc`.

## Objetivo
1. **AP novo:** AP máximo = 6 + floor(speed / 25) (speed = stat de Speed calculado do Pokémon no nível dele). **MP deixa de existir**: mover custa 1 AP por tile (pode gastar todo o AP só para se reposicionar). Atacar/status gasta AP pelo custo derivado abaixo.
2. **Custo de golpe derivado por fórmula** (substitui `apCost` manual), com tabela de exceções revisável:
   - Dano: `max(1, round(0.10 × poder efetivo))`, onde poder efetivo = poder × hits médios (multi-hit) × fator de alvos (golpes que viraram área/linha/cone/grande área custam mais, ex.: ×1.0 single, ×1.25 linha/cone, ×1.5 área pequena, ×2.0 grande área) ; golpes de carga/recarga ajustados.
   - Status: base 3 AP; + por efeito adicional (segundo status, stat stage extra), × fator de alvos (área/grande área), + para buff em todos os aliados; teto sensato (ex. ≤ 6).
   - Golpes sem poder fixo (OHKO, fixos, variáveis) com regra explícita.
3. **Revisão do usuário (2026-10-06, após a 021):** usar a Poké Ball **gasta 4 AP**; capturar dá **o mesmo EXP de derrotar o Pokémon + 20%** (`xpRatio` 1.2 em vez da curva parcial atual, valorizando capturar vs. matar); na pós-batalha com **múltiplas capturas** a tela de captura (task 021) mostra **uma de cada vez**, com opção **SEND ALL TO BOX** (manda todas as pendentes para a box, **sem apelido**).
4. **Reverter captura** para o comportamento de referência (ver decisão abaixo): sem exigir HP baixo nem selvagem único, jogar ball gasta AP e **não encerra a batalha**; fórmula de captura FireRed (HP, status, catch rate, ball); captura bem-sucedida remove o selvagem e a batalha continua até acabar os demais; falha = o selvagem continua (sem fuga automática). Remover/ajustar Auto Catch e XP parcial por captura conforme o novo modelo.

## Decisões em aberto (confirmar ao rodar; registrar em decisions.md)
- "Reverter o sistema de captura" = voltar a qual versão? Premissa do plano: captura FireRed-fiel como acima (ball sem gate de HP, falha mantém o duelo). Se a intenção for outra versão do histórico, escolher o commit-alvo antes de implementar.
- Speed da fórmula: stat calculado no nível (premissa) vs. speed base.
- Custo de ball/itens (hoje usam AP): manter custo atual (ex.: 3?) a definir.

## Decisões em aberto adicionais
- Capturar dá EV yield? (FireRed não; premissa: continua **sem EV**, só o EXP +20%.) Confirmar.
- Limite de balls por turno não pedido; o custo de 4 AP já limita (AP base 6+).

## Acceptance
- [ ] `maxAp = 6 + floor(speed/25)`; testes de borda (speed 24/25/49/50, nível 5 vs 100).
- [ ] MP removido do engine, IA, UI (`MP x/y`, alcance azul) e saves; movimento custa 1 AP/tile e respeita AP restante.
- [ ] `apCostFor(move)` determinístico por fórmula + tabela de exceções, cobrindo: multi-hit, golpes de área/linha/cone/grande área, golpes de status com 1 efeito, múltiplos efeitos, status em área, buff em todos aliados; teste que lista custo de todos os golpes do Kanto e valida faixa (1–6) e médias (dano ≈10% poder; status ≈3).
- [ ] IA tática respeita o novo orçamento (mover+atacar), sem loops/travamento (fuzz de auto-battle como na task 018).
- [ ] Poké Ball custa 4 AP (constante única, refletida na UI e na IA); testes de AP restante.
- [ ] EXP de captura = EXP de derrotar × 1.2 (arredondado para baixo, por participante, mesma divisão da party); remove `failedCaptureXpRatio`/curva parcial; teste comparando captura vs. kill.
- [ ] Várias capturas na mesma batalha: `story.pendingCapture` vira fila persistida (`pendingCaptures`, migrando o campo antigo); `CaptureSummary` mostra a primeira e "n/N"; SEND ALL TO BOX move todas para a box sem apelido (se a box encher, o restante continua pendente com aviso); testes de lib (`resolveAllPendingToBox`) e e2e.
- [ ] Captura: sem gate de HP/selvagem único; ball gasta AP, não encerra batalha; sucesso remove alvo, falha mantém; testes de engine + fluxo no client (resultado/EXP/Pokédex).
- [ ] UI: HUD mostra só AP (barra/valor), custo do golpe no menu; i18n 5 idiomas; screenshots 1365×768 e ~1792×851.
- [ ] `pnpm e2e:playthrough` continua verde (rebalancear nível/party se necessário); `pnpm test` e typechecks.

## Arquivos prováveis
packages/battle-engine/src/{duel,capture,types}.ts (+ novo `actionCost.ts`), packages/battle-engine/test/{duel,capture,ai-decisions}.test.ts, apps/client/components/FirstBattle.tsx, CaptureSummary.tsx, lib/captureChoice.ts, lib/story.ts (fila `pendingCaptures`), lib/battleResult.ts, GameClient.tsx (outcome.capture → várias capturas), i18n catalog/battle.ts, .claude/knowledge/battle-system.md.

## Riscos
Mexe no coração do combate: rebalanceia tudo (wild packs, ginásios, E4) — rodar playthrough e ajustar. AP maior em Pokémon rápidos pode quebrar IA/AI loops. Remoção de MP afeta UI, saves em andamento não (AP/MP não persistem). Captura sem gate afeta economia de captura e Pokédex: considerar limite de balls por turno.

## Ordem de commits
1. `feat: derive move action costs from power, hits and area` (actionCost.ts + testes)
2. `feat: action points scale with speed and replace movement points`
3. `fix: tactical AI under the new action budget`
4. `feat: revert capture to FireRed-style throws that keep the battle going`
5. `feat: battle HUD for the new action points`
6. `docs: battle-system knowledge for AP and capture` + ajustes de balanceamento/playthrough
