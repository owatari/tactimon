# Plan — 029 balanceamento de AP + IA de Auto Catch

## Estado atual (task 026)
- AP = 6 + floor(Speed/25); mover 1 AP/tile; golpes ≈10% do poder (teto 10), status ≈3 (teto 6); Poké Ball 4 AP; poções/itens sem AP.
- Auto Catch (`resolveSimpleAiTurnDetailed`, `options.autoCapture`, `chooseAiItemAction`, `isDuelAutoCatchTarget`): só joga a bola quando o alvo já está com HP ≤ 30% (`AUTO_CATCH_HP_RATIO`); fora disso a IA joga como no Auto Battle (mata o alvo). Só captura um alvo por vez.
- Pendências conhecidas da 026: espécies lentas com golpes caros (6 AP não usa golpe de 10), poções sem custo, chance de captura invisível, sem limite de bolas.

## Objetivo
### A. Balanceamento fino (dados antes de mexer)
1. Script/teste de auditoria que imprime, por espécie/nível (5, 20, 50, 100): AP máximo, custo dos golpes, quantos golpes são utilizáveis, "turnos para atacar" (andar+golpe) — achar espécies com 0–1 golpe utilizável e golpes com custo > AP típico.
2. Ajustes baseados na auditoria (decidir em decisions.md com números): teto de dano (10 → ?), curva de custo para poder alto, bônus de AP para espécies lentas ou golpes de custo > AP, custo de itens (poção/cura = 2–3 AP?), pool mínimo para usar qualquer golpe, valor de Speed por AP.
3. Checar economia do jogo: ginásios/E4 continuam vencíveis (`pnpm e2e:playthrough`), selvagens iniciais não ficam mais difíceis (task 019), duração média da batalha (turnos) por tipo de encontro.

### B. IA de Auto Catch (captura acima de tudo)
Com Auto Catch ligado, **todos** os Pokémon da party agem para capturar **todos** os selvagens, em ordem de prioridade (mais fáceis/valiosos primeiro):
- Meta por alvo: maximizar a chance de captura (`fireRedCaptureChance`): baixar HP **sem matar**, aplicar status (sleep ×2, paralisia/veneno/queimadura ×1,5) e então jogar a bola quando a chance esperada compensar o custo (4 AP) / ou assim que a bola for a melhor ação.
- Escolha de golpe por alvo: (1) golpe de status que causa sleep/paralisia/veneno/queimadura se o alvo não tem status; (2) golpe de dano cujo dano esperado **não mata** (deixa HP ≥ 1; preferir levar o alvo à faixa de HP baixo, ex. 10–35%); (3) nunca um golpe que mata, **exceto** se o Pokémon agindo vai morrer antes de agir de novo (risco de KO no próximo round maior que seu HP): nesse caso prioriza matar o atacante mais perigoso (comportamento atual de sobrevivência).
- Prioriza o catch ao próprio bem-estar (não recua, não cura a si mesmo, aceita levar dano) até o limiar de morte iminente.
- Distribui o trabalho: um Pokémon enfraquece/inflige status enquanto outro joga a bola; usa o AP restante (4 AP da bola reservado quando o alvo está pronto).
- Vale para wild packs (até 10): captura todos antes de terminar; trata o caso "último selvagem restante" (matar encerraria a batalha sem captura).
- Respeita bolas disponíveis (`poke-ball`, `great-ball`…): usa a melhor para alvos difíceis, para quando acabarem (volta ao Auto Battle normal).
- Sem Auto Catch o comportamento atual não muda.

## Acceptance
- [ ] Auditoria de AP/golpes versionada (teste que falha se alguma espécie jogável ficar sem golpe utilizável no AP base do seu nível) e decisões numéricas registradas.
- [ ] Ajustes de balanceamento aplicados e cobertos por testes (`action-cost.test.ts` + novos).
- [ ] IA Auto Catch: em simulações (≥ 200 seeds, packs 1–10, party 1–6) captura ≥ X% dos selvagens (meta a definir após baseline, ex. > 80% com bolas suficientes), não mata alvos desnecessariamente (taxa de mortes < 10% quando há bolas), nunca trava (sem no-progress).
- [ ] Prioridade de morte: quando o agente ia morrer no round, a IA mata o alvo/ameaça em vez de capturar (teste dedicado).
- [ ] `pnpm e2e:playthrough` e `pnpm e2e:walkthrough` verdes; screenshots do HUD de AP se algo visual mudar.

## Arquivos prováveis
packages/battle-engine/src/{actionCost,duel,capture}.ts (IA `chooseAiCandidate`/`chooseAiItemAction`/`resolveSimpleAiTurnDetailed`), packages/battle-engine/test/{action-cost,ai-ap-fuzz,ai-autocatch}.test.ts (novo), apps/client/components/FirstBattle.tsx (só se o Auto Catch precisar de feedback), i18n, .claude/knowledge/battle-system.md.

## Riscos
Rebalancear AP/custos muda a duração das lutas e a dificuldade (rodar playthrough); a IA de captura pode ficar lenta (limitar busca) ou ficar presa em ciclo "debuff → bola → falha"; bolas insuficientes; risco de levar o time inteiro à morte tentando capturar; conflitos com o fluxo de fila de capturas do client.

## Testes necessários
Engine: auditoria de AP; cenários determinísticos de IA (alvo cheio → status ou dano que não mata; alvo com HP baixo → bola; agente prestes a morrer → mata; último selvagem → não mata, captura); fuzz estatístico de captura; regressão do Auto Battle sem Auto Catch.

## Ordem de commits
1. `test: AP and move cost audit` 2. `feat: AP balance adjustments` 3. `feat: Auto Catch AI that weakens without killing and throws the balls` 4. `test: Auto Catch statistics and survival priority` 5. `docs: battle-system knowledge`
