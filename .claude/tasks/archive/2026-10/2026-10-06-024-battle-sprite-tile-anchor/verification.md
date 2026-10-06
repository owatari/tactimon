# Verification — 024
- Diagnóstico: engine sem sobreposição (5064 passos + novo `unique-positions.test.ts`, 60 seeds); causa visual = corpo do sprite chegava a 1,5–2,2 tiles de largura (Onix 2,24, Articuno 2,07, Gyarados 1,87...).
- Fix: `spriteTileSpan` limita largura ≤ 1 tile e altura ≤ 1,4; teste de auditoria no manifest real (151 espécies) valida o invariante + testes de Onix/corpo alto.
- `pnpm test`: 93 arquivos/501 testes (client) + engine; typecheck 0 erros. Screenshots 1365×768 (ginásio de Brock, 12 unidades) e 1792×851 (Route 3): cada sprite dentro do seu tile com sombra; rótulos legíveis.
- Tentativa descartada: rótulo sempre abaixo → nomes se sobrepõem horizontalmente; mantido o xadrez acima/abaixo.
