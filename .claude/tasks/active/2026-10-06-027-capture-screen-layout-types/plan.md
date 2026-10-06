# Plan — 027 layout da tela de captura + ícones de tipo

## Estado atual (investigado)
- `CaptureSummary.tsx` (task 021): retrato, `TYPE` e `NATURE` como `dl`, tabela STAT/IV sem divisórias, golpes como lista solta (`.capture-moves`), botões NICKNAME/TEAM/BOX.
- A ROM já tem os ícones de tipo da FireRed extraídos para `public/game-assets/gba-ui/` (índice `interface/pokemon_types` com paleta + `text_window/type1`; ver `index.json`). A pipeline ROM→PNG (`tools/asset-extractor/convert_ui.py`) já converte esses assets; confirmar se o PNG de tipos (sprites 32×12 por tipo) já é gerado; senão, adicionar ao `ui-offsets.json`/conversor.

## Objetivo
1. **Card com divisões de tabela**: grade com linhas/colunas e bordas internas (cabeçalho STAT | VALOR | IV | EV), zebra leve, nature destacada em célula própria; blocos claramente separados (identidade, stats, golpes, ações) no padrão `fr-window` da UI.
2. **Golpes em 4 slots fixos** (2×2): cada slot mostra nome + ícone de tipo + PP/AP; slot vazio fica como "—". **Hover/foco** abre um tooltip/painel com tipo, categoria (físico/especial/status), poder, precisão, **custo em action points** e a descrição da ROM (`MOVE_DESCRIPTIONS`).
3. **Ícones de tipo da ROM** no lugar do texto "BUG / POISON" (e nos slots de golpe). Se algum tipo não existir na ROM (ex.: tipos fora do Gen III), criar ícone colorido no estilo da UI (pílula pixel-art com cor do tipo e contorno escuro). Mesmo componente `TypeIcon` reutilizável (Summary, Pokédex, batalha depois).

## Acceptance
- [ ] `TypeIcon` (ROM) renderiza os 17 tipos Kanto + fallback colorido; `image-rendering: pixelated`, sem esticar; teste de mapeamento tipo→sprite.
- [ ] Tela de captura com tabela de stats com divisórias visíveis e IV/EV alinhados; nature em célula destacada.
- [ ] 4 slots de golpe (2×2) com hover/foco por teclado mostrando tipo, categoria, poder, precisão, AP, PP e descrição; funciona com setas/Tab e no mobile (toque).
- [ ] Custo em AP lido de uma única função (`apCostFor`); enquanto a task 026 não existir usa `apCost` atual do golpe.
- [ ] i18n 5 idiomas (rótulos novos: CATEGORY, POWER, ACCURACY, AP, PP, —); screenshots 1365×768 e ~1792×851; `pnpm e2e:walkthrough` (E8) continua verde.

## Arquivos prováveis
apps/client/components/CaptureSummary.tsx (+ novo `TypeIcon.tsx`, `MoveSlot.tsx`), app/globals.css, lib/i18n/catalog/capture.ts, tools/asset-extractor/{convert_ui.py,ui-offsets.json} (se faltar o PNG de tipos), tests (mapeamento de tipos; `MOVE_DESCRIPTIONS`/dados do golpe), tools/e2e/walkthrough.e2e.ts.

## Riscos
Tooltip no canvas/overlay pode ser cortado pelo card (usar posicionamento dentro do painel); custo de AP muda com a task 026 (isolar em uma função); paleta dos ícones de tipo da ROM (BGR555) já tratada pelo conversor.

## Testes necessários
Lib: mapa tipo→ícone/cor; formatação de poder/precisão/AP por golpe (status = "—"). UI: screenshots + E2E de hover (`.move-slot:hover` → tooltip visível).

## Ordem de commits
1. `feat: TypeIcon with ROM type sprites` 2. `feat: capture screen table layout and four move slots with hover details` 3. `docs: UI knowledge for type icons and move slots`
