# Decisões — 040 desvantagem de quem começa

## Medição (mirror fights: mesmo time nos dois lados, mesma IA, ambas orientações — jogador primeiro e rival primeiro — somadas; times 2/3/4/6; ~2400 lutas por variante; `test/first-mover.test.ts`, `FM_SEEDS=300 FM_TILES=0,1,2`)
| variante | vitória de quem age 1º | gap (pp) | por time (2/3/4/6) |
| --- | --- | --- | --- |
| baseline (sem abertura) | 41,0% | **−9,0** | −8,8 / −8,3 / −8,0 / −11,0 |
| abertura de 1 tile (todos andam 1 tile grátis antes do round 1) | 46,0% | **−4,0** | −10,2 / +5,5 / −11,2 / −0,3 |
| abertura de 2 tiles | 55,0% | **+5,0** | −2,8 / +7,8 / +9,5 / +5,6 |
| (amostra menor) 3–6 tiles | 59–67% | +9 a +17 | passam do ponto: 1º golpe decide |
| (amostra menor) ordem do round 1 por distância (opção 5) | 46,6% | −3,4 | quase igual ao baseline; só afeta o round 1 |
- 1v1 espelhado: baseline 56% para quem age 1º; com qualquer abertura ≥1 tile o 1º a agir vence ~93% (os dois já estão em alcance: Speed decide). É o comportamento "Pokémon" esperado, mas por isso o critério foi medido em times ≥ 2.
- Stall: 0 lutas travadas em todas as variantes (mesmo "quiet" máximo de 72 passos sem dano do baseline, pré-existente).

## Escolha
- **Opção 1/2 (abertura simultânea) com 1 tile** (`OPENING_TILES = 1`, `applyOpeningMovement` chamado em `createTrainerDuel`/`createWildDuel`/starter): gap −9,0 → −4,0 (dentro de ±5), sem UI nova (as unidades já nascem 1 tile mais perto; não há fase interativa).
- 2 tiles deu +5,0 (também ok) mas o Auto Catch passou a matar ~9,6% do que podia capturar (baseline ~4%, limite 8%) porque o combate começa mais perto; 1 tile mantém `ai-autocatch` verde.
- Opções 3 e 4 (AP/espera da IA) descartadas: as medições 1–2 já atingem o critério sem risco de stall. Opção 5 não mexeu o gap.
- Testes que verificam o layout bruto de spawn (`spawn-placement`, 2 em `duel.test`) passam `openingTiles: 0`.
