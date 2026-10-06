# Plan — 030 prioridade por raridade no Auto Catch + custo de AP por item

## Estado atual (tasks 026/029)
- `planAutoCatch` (duel.ts) ordena os alvos só pela **chance de captura** (maior primeiro, depois HP). Sem noção de raridade/shiny. A decisão "vai morrer → mata" vem da 029 (`aiExpectedIncomingDamage`).
- Itens de batalha (`DUEL_ITEMS`): potion, super-potion, hyper-potion, antidote, parlyz-heal, awakening, burn-heal, bolas. Poção/cura custam **3 AP** (`ITEM_AP_COST`, task 029); bola 4 AP (`POKE_BALL_AP_COST`). Não existem revive / full restore em batalha (só no Bag via `ITEM_EFFECTS.revive`).
- Raridade já existe nos dados: taxa de captura da ROM (`catchRateFor`, 3–255; menor = mais raro) e a flag `shiny` do `DuelUnit`.

## Objetivo
### A. Auto Catch: raros primeiro, shiny no topo, captura acima da própria vida
1. **Prioridade de alvo** (substitui o ranking por chance): 1º shiny; depois por raridade (catch rate ascendente, com evolução final/lendário-like acima — tabela de peso, ex.: catchRate ≤ 45 = raro, ≤ 90 = incomum); desempate pela chance atual. Raros/shiny são trabalhados **antes** dos comuns mesmo que a chance atual seja menor (enfraquecer/status neles primeiro) e recebem a **melhor bola** disponível mais cedo (shiny: Great/Ultra, até Master se esgotar tentativas).
2. **Priorizar o catch à própria vida**: para alvos shiny/raros, o limiar de "vai morrer" da 029 sobe (só cai para a IA que mata quando a morte é praticamente certa, ex. dano esperado ≥ 1,5× HP e o agente não tem como capturar neste turno), e o Pokémon aceita levar dano/desmaiar para completar a captura de um shiny; para comuns mantém o comportamento da 029. Regra explícita para a ordem: **nunca matar um shiny** (nem em "sobrevivência": prefere sacrificar a unidade a matar o shiny; quando o shiny é o único alvo de risco usa status/sleep para neutralizar).
3. **Deslocamento/foco de time**: todos os Pokémon da party concentram status/dano não letal no alvo prioritário e quem tem AP ≥ custo da bola joga; não gastar bola em comuns enquanto um shiny/raro vivo ainda está longe de ficar capturável (a menos que seja o último AP útil).
4. Capturar todos continua sendo a meta (raros primeiro, depois o resto).

### B. Custo de AP dos itens (média 4)
- Tabela única `ITEM_AP_COSTS` (em `actionCost.ts`): média ≈ 4, escalonada por força/utilidade. Proposta inicial (a ajustar na execução com a auditoria): potion **4** (mínimo), antidote/parlyz-heal/awakening/burn-heal **4**, super-potion **5**, hyper-potion **6**, max-potion **7**, revive **6**, max-revive/full-restore **8** (teto para itens), bolas: poke **4**, great **4**, ultra **5**, master **6** (decidir se bolas entram no "média 4": proposta mantém Poké/Great = 4).
- Itens de batalha novos (hoje faltam): revive/max-revive (reanima aliado desmaiado) e full-restore (HP cheio + cura status), max-potion; ligados ao Bag (`ITEM_EFFECTS`) e à Mart/loot existente (sem criar novas lojas).
- Substitui `ITEM_AP_COST` fixo (3) por custo por item; UI mostra o custo de cada item no menu; IA de rivais/auto battle respeita o custo e prefere o item mais barato que resolve.
- Rebalancear usando `tests/ap-audit.test.ts` (custo médio de itens ≈ 4–5; o item mais caro cabe no AP base 6–9 de um Pokémon médio? se não, ajustar teto).

## Acceptance
- [ ] `catchPriority(unit)` pura e testada: shiny > raro (catch rate baixo) > comum; desempate determinístico; testes com packs mistos (shiny comum vs raro não-shiny, etc.).
- [ ] Em simulação (≥ 200 seeds, packs com shiny/raros injetados): shiny capturado ≥ 95% das vezes quando há bolas, **nunca morto** pela IA; raros capturados primeiro (ordem de captura verificada); taxa geral de captura ≥ baseline da 029 (~90%).
- [ ] Cenário "vai morrer": com shiny na mesa a IA não cai para o modo que mata o shiny; com comum mantém a regra da 029.
- [ ] `ITEM_AP_COSTS` com média documentada ≈ 4, potion = 4 (mínimo), full-restore/max-revive = máximo; todas as ações de item (engine, IA, UI do FirstBattle e Bag em batalha) usam a tabela; testes por item.
- [ ] Novos itens de batalha funcionando (revive/max-revive/full-restore/max-potion) com testes e UI; i18n 5 idiomas.
- [ ] `pnpm e2e:playthrough` e `pnpm e2e:walkthrough` verdes; screenshots do menu de itens (1365×768 e ~1792×851).

## Arquivos prováveis
packages/battle-engine/src/{actionCost,duel,capture}.ts, packages/battle-engine/test/{ai-autocatch,action-cost,battle-items}.test.ts, tests/ap-audit.test.ts, apps/client/components/FirstBattle.tsx, apps/client/lib/{itemUse,items,mart}.ts, i18n catalog, .claude/knowledge/battle-system.md.

## Riscos
Shiny sempre priorizado pode custar a vida da party em batalhas difíceis (limite de "vai morrer" precisa de teto: aceitar perder a unidade, não o time inteiro); custo de item 4+ AP torna curar caro frente a atacar (rebalancear poções/IA de rival); novos itens exigem fonte (lojas/loot) para não ficarem órfãos; efeito no playthrough (IA dos treinadores usa poções).

## Testes necessários
Engine: prioridade (shiny/raro), simulação com shiny, ordem de captura, regra de sobrevivência com e sem shiny, custos por item e novos itens; client: menu de itens com custo; auditoria de AP atualizada.

## Ordem de commits
1. `feat: per-item AP costs and the missing battle items` 2. `feat: Auto Catch targets shiny and rare Pokémon first` 3. `test: shiny/rare capture simulations` 4. `feat: item menu shows AP costs` 5. `docs: battle-system knowledge`
