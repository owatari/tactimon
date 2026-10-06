# Verification

## Tabela de auditoria (tela → desvio da ROM → estado)
| Tela | Desvio | Estado |
| --- | --- | --- |
| Pokédex | sem sprite frontal, sem categoria/altura/peso/descrição, sem área, lista com 9 linhas e sem Poké Ball de capturado | **Refeita** (lista + entrada + área; dados da ROM; sprites FireRed) |
| Party | retratos PMD; fundo creme | **Parcial**: sprite frontal FireRed + fundo verde-água + slots com borda escura. Falta layout 2 colunas (líder grande) |
| Summary | retrato PMD | **Parcial**: sprite frontal 3x em moldura. Falta layout de páginas FR (barra de EXP, golpes com ícones de tipo) |
| Trainer Card | texto em lista | **Parcial**: medalhas maiores/bordas. Falta cartão FR (nome/ID, medalhas com sprite) |
| Start menu raiz | caixa creme com ▶ | OK (já próximo do FR) |
| Bag | lista simples | Pendente (FR: bolsa à esquerda, lista à direita, setas de bolso) |
| Options / Save / Town Map / Mart / Storage / batalha HUD / pós-batalha / evolução / Game Corner | não auditadas em screenshot nesta passada | Pendente → task 016 |

## Comandos
- `python tools/rom-data/generate-pokedex.py` → 151 entradas (gPokedexEntries @ 0x44e854, stride 0x24).
- typecheck client OK; `pnpm test`: 83 arquivos / 434 testes + engine 215 verdes (i18n incluso).
- Screenshots 1365×768 e 1792×851 (páginas temporárias removidas): lista, entrada (Charmander: LIZARD, 2'00", 18.7 lbs.), área, party, summary.
