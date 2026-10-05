# Verificação

| Comando / checagem | Resultado |
| --- | --- |
| baseline `pnpm test` (working tree inicial) | tests/ 45 files 219 ✓; engine 1 ✗ (deployment scale) |
| `pnpm --filter @tactimon/battle-engine typecheck` | ✓ |
| `pnpm --filter @tactimon/client typecheck` | ✓ |
| `pnpm test` final | tests/ 49 files 238 ✓; engine 6 files 200 ✓ (deployment scale inalterado ✓) |
| `git diff --cached --check` em cada commit | ✓ |
| `node tools/sprite-importer/audit-sprites.mjs` | 47 espécies, 1 flag informativa (magnemite canvas 27%) |
| Screenshot batalha 1365×768 e 1792×851 (`/battle-preview`) | sprites ≥ 1 tile, Onix ~2,2 tiles ancorado |
| Grid de sprites idle/walk/attack/hurt (rota temporária) | tamanho estável entre animações, pés na linha de chão |
| Tela de resultados 1365×768, 1792×851, derrota tutorial | compacta, botão visível, sem overflow |
| E2E auto battle (CDP) | faint some em ~280 ms; resultado abre ~650 ms após o fim |
| Overworld com save fixture (Route 3) | RUN ~136 ms/tile; R e clique alternam; sem shoes → sem indicador e R ignorado |
| Agente verifier | sem regressões; 1 achado refutado empiricamente |
