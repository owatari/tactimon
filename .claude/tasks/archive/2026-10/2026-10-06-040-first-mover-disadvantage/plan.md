# Plan — 040 Desvantagem de quem começa a batalha (design + protótipo medido)
## Problema (descrito pelo usuário)
Quem age primeiro precisa andar até o inimigo, então leva desvantagem; dar mais AP ao primeiro é estranho porque a ordem vem da Speed (pode haver inimigo, jogador, inimigo...), e fazer a IA "esperar" pode causar stall.
## Investigação / opções a avaliar
Medir em simulação (`ai-ap-fuzz`: milhares de lutas com seeds fixas, par de times iguais) a **diferença de taxa de vitória entre quem age primeiro e quem age depois** e comparar:
1. **Fase de abertura simultânea (recomendada para testar primeiro)**: antes do round 1, todo mundo ganha movimento livre (ex.: até N tiles, sem custo de AP, sem atacar) — o jogador se posiciona e a IA também; a ordem de Speed só decide quem ataca primeiro depois. Remove "quem anda até o outro" da equação sem mexer na ordem.
2. **Distância inicial limitada**: spawn dos dois lados a no máximo X tiles (alcance de golpe + AP de caminhada) para que o primeiro ataque seja possível no round 1 (pode combinar com 1).
3. **AP no primeiro round compensado por tempo de espera, não por ordem**: o AP "sobrando" de quem não precisou andar vira bônus de defesa/PP? (provável complexidade; manter só se 1–2 falharem).
4. **IA pondera esperar com limite anti-stall**: segurar posição só se o inimigo está dentro do alcance de avanço do time e há vantagem de primeiro golpe; "contador de engajamento" (após 2 rounds sem dano, a IA avança obrigatoriamente) e prioridade ao dano esperado para evitar que ficar parado seja sempre melhor.
5. **Iniciativa em fila única já existente + bônus de iniciativa por distância**: quem está mais longe do alvo age antes no round 1 (reordena só o round 1).
Critérios: gap de vitória entre primeiro e segundo ≤ ~5 pontos percentuais; sem stalls (nenhuma luta > N rounds sem dano); Auto Battle/Auto Catch/rivais continuam funcionando; wild packs de até 10.
## Acceptance
- [ ] Script de simulação reproduzível e relatório em `decisions.md` com o gap antes/depois de cada opção.
- [ ] Opção escolhida implementada na engine com testes determinísticos (seed) e e2e/playthrough 14/14.
- [ ] Knowledge `battle-system.md` atualizado.
## Arquivos prováveis
packages/battle-engine/src/duel.ts (spawn/turno/IA), test/ai-ap-fuzz.test.ts, novo test/first-mover.test.ts, FirstBattle.tsx (UI da fase de abertura, se escolhida).
## Riscos
Mexe no coração do combate; UI da fase de abertura para o jogador (mover antes do round 1) e Auto; balanceamento dos wild packs.
## Ordem de commits
1. `test: first-mover advantage measurement` 2. `feat: <opção escolhida>` 3. `docs`
