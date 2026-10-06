# Plan — 031 itens mais caros, Revive em aliados caídos, % de captura no hover, animação de captura completa, IA completa dos rivais

## 1. Custos de AP (`ITEM_AP_COSTS`, `actionCost.ts`)
Revive, Full Restore e Max Revive passam a ser os mais caros. Proposta (confirmar na execução com `tests/ap-audit.test.ts` e o histograma de AP): Max Potion 6, **Revive 7, Full Restore 8, Max Revive 9** (só Pokémon com Speed ≥ 75 pagam 9). Ordem final testada: potion (4) ≤ … < max-potion < revive < full-restore < max-revive.

## 2. Revive em quem já chega caído
Hoje `deployedParty` exclui membros com HP 0, então o Revive só alcança quem cai *durante* a batalha. Passar a levar todos os membros ao engine: unidades com `hp 0` entram no estado **fora do tabuleiro** (sem tile, sem turno, não alvo de golpes/IA), listadas no HUD como "caídas" e selecionáveis para Revive/Max Revive; ao reviver entram no tile livre mais próximo (`findReviveTile`) e agem no próprio turno. O mapeamento de volta ao save (`playerHp` por índice de party) continua estável; vitória/derrota só contam unidades vivas; uma party 100% caída continua sendo whiteout (nem entra em batalha).

## 3. % de captura no hover
Com uma Ball selecionada (`command === "item-target"`), passar o mouse (ou focar por teclado) em um selvagem mostra um tooltip "Catch XX%" calculado pela **mesma função do engine** (`fireRedCaptureChance` com a bola escolhida, HP/status atuais): nova `captureChanceFor(state, targetId, ballId)` exportada e testada (bate com o que `use-item` usa); também no seletor de alvo do Auto Catch? (só informativo).

## 4. Animação de captura até o fim antes do "battle ended"
O engine marca `status: "finished"` no instante do arremesso e o `FirstBattle` dispara `onComplete` ~650 ms depois, cortando a animação. Mudar para: sequência completa (arremesso → ball treme 1–3 vezes → clique de sucesso **ou** escape) e só então o fim de batalha; o completion espera um "apresentação concluída" (`presentationBusy`) em vez de um timer fixo; vale a 40× (turbo) e em Auto Catch (várias capturas em fila). Teste E2E: a captura final não pula direto para os resultados.

## 5. IA completa dos rivais
Auditar o que a IA de treinador/rival (`resolveSimpleAiTurnDetailed`, lado `rival`) faz hoje: só Poção (`chooseAiItemAction`), sem itens novos, sem revive, sem cura de status, sem buffs/debuffs planejados, sem golas/áreas pensadas, sem usar AP por completo. Objetivo: **usa tudo que for possível** — todos os itens do bag do rival (poções por faixa de HP/ameaça, cura de status, Full Restore/Revive de aliado caído, bolas não), todos os golpes (status, buffs de stat, área, carga, multi-hit, prioridades), movimentação tática, foco de alvo, proteção do ás, e gasto inteligente de AP (item vs golpe vs andar). Estrutura: planejador por turno que enumera ações (mover/golpe/item) com custo de AP e escolhe a sequência de maior valor (busca curta de 2–3 ações), com pesos por situação (lethal check, risco, cura necessária). Líderes de ginásio/E4/Campeão recebem bag de itens coerente com o jogo (ex. 1–2 Full Restore/Hyper Potion nos fortes) em `trainers.ts`.

## 6. Resposta à dúvida sobre "raridade" (registrar na doc)
O Auto Catch (task 030) mede raridade **só** pela taxa de captura da ROM (≤ 45 = raro, ≤ 120 = incomum, resto comum) mais o flag shiny. Isso não conhece conceitos como lendário/mítico, pseudo-lendário (Dragonite), Pokémon inicial, fóssil ou "forma final de evolução": ex. Dragonite, Charizard e Snorlax caem em raro por acaso (taxa 45/45/25), mas Pikachu (190), Growlithe (190) ou Ponyta (190) aparecem como comuns mesmo sendo valiosos, e Chansey ou Eevee (30–45) contam como raro igual ao Gyarados. **Entregar**: tabela curada `RARITY_OVERRIDES` (lendário/mítico, pseudo-lendário, inicial, fóssil, formas finais) que sobe o tier de espécies específicas e mantém a taxa de captura como base; testes de ordenação por tabela.

## Acceptance
- [ ] Custos: revive < full-restore < max-revive, todos acima de max-potion; tests/item-ap-costs atualizado; UI mostra os novos custos.
- [ ] Pokémon caído antes da luta aparece no HUD como caído e pode ser revivido (engine + UI); vitória/derrota e HP no save corretos (testes de ida/volta).
- [ ] Hover com Ball mostra a chance e ela coincide com a do engine em 1.000 amostras (teste de propriedade); mostra "—" para alvos não capturáveis.
- [ ] Captura: nenhum "battle ended" antes do fim da animação (E2E + teste de lib do estado de apresentação), inclusive a 40×.
- [ ] IA rival: simulação ≥ 200 batalhas — usa pelo menos um item em ≥ X% das lutas em que o bag permite, usa revive/full restore quando cabe, não trava; winrate contra o auto-play do jogador sobe vs baseline registrado (e playthrough 14/14 continua verde com os líderes/E4 mais fortes).
- [ ] `RARITY_OVERRIDES` + testes; documentação de rarity em `battle-system.md`.
- [ ] i18n 5 idiomas, screenshots 1365×768 e ~1792×851.

## Arquivos prováveis
packages/battle-engine/src/{actionCost,duel,capture}.ts (+ possível `rivalAi.ts` extraído), apps/client/components/FirstBattle.tsx, lib/{itemUse,trainers}.ts, GameClient.tsx (deployedParty/HP), i18n, tests/ap-audit.test.ts, packages/battle-engine/test/*, tools/e2e.

## Riscos
Unidades caídas no estado do engine tocam vários invariantes (turn order, spawn, vitória); IA mais forte pode quebrar o equilíbrio dos ginásios (rebalancear níveis/bags e rodar o playthrough); cronometrar o fim de batalha com animações em modo turbo e Auto; custo 9 do Max Revive inutilizável para Pokémon lentos (aceito como pedido).

## Ordem de commits
1. `feat: pricier revive and restore items` 2. `feat: revive Pokémon that arrive fainted` 3. `feat: capture odds on hover and full capture animation before battle end` 4. `feat: complete rival AI that uses every move and item` 5. `feat: rarity overrides for Auto Catch` 6. `docs: battle-system knowledge`
