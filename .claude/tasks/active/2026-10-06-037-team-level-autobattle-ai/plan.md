# Plan — 037 IA do Auto Battle em nível de equipe
## Estado atual (investigado)
`resolveSimpleAiTurnDetailed` (`packages/battle-engine/src/duel.ts` ~8470+) decide por unidade: escolhe golpe/alvo pelo melhor dano esperado **daquele** Pokémon, com movimento estratégico e itens (`chooseAiItemAction`); não há plano coletivo. O Auto Catch (`planAutoCatch`) já planeja por grupo de alvos — é o modelo a seguir.
## Objetivo
O Auto Battle (e a IA do rival, que usa o mesmo caminho) planeja **o time inteiro como um só jogador**:
1. **Efetividade primeiro**: golpes super efetivos têm prioridade; evitar resistidos/imunes quando há alternativa (STAB, precisão, AP, PP).
2. **Escolha de alvo no nível do time**: avaliar cada inimigo por (a) quem do time o cobre com super efetividade, (b) ameaça que ele representa ao time, (c) chance de KO neste turno combinando aliados. Distribuir os atacantes para maximizar KOs e reduzir o dano recebido (focar o que o time resolve, em vez de "cada um bate no mais perto").
3. Coordenação: não desperdiçar dois aliados num alvo que um já mata; usar status/buffs de área quando o time se beneficia; aproximar quem tem cobertura do alvo certo; curar/reviver por ameaça ao time.
4. Determinismo (seed) e orçamento de AP/PP respeitados; sem loops lentos (10 selvagens × 6 aliados).
## Acceptance
- [ ] Função pura `planTeamTurn(state, side)` devolvendo atribuições alvo/golpe por unidade, usada pelo loop da IA; testes de cenário: super efetivo preferido; alvo escolhido pela cobertura do time (aliado de Água cobre o inimigo de Fogo → o de Grama ataca o outro); sem overkill duplicado; imune evitado.
- [ ] Simulação em massa (estilo `ai-ap-fuzz`): vitórias/KOs e dano recebido melhores que a IA atual em cenários fixos; sem travar; e2e playthrough 14/14.
- [ ] Vale para rivais; Auto Catch continua com prioridade própria (captura primeiro).
- [ ] Doc em `.claude/knowledge/battle-system.md`.
## Arquivos prováveis
packages/battle-engine/src/duel.ts (ou novo `teamAi.ts`), test/ai-team.test.ts, test/ai-ap-fuzz.test.ts.
## Riscos
Desempenho (aliados × inimigos × golpes), regressões no balanceamento do playthrough, interação com Auto Catch / itens / movimento.
## Ordem de commits
1. `feat: team-level target and move planner` 2. `feat: auto battle and rival AI use the team plan` 3. `docs`
