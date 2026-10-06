# Plan — 2026-10-05-017-battle-ui-fidelity (escopo redefinido pelo usuário)

## Pedido (nova diretriz)
"Não quero mais CSS falsos, quero os painéis da ROM mesmo, quero os assets que faltaram e que já tínhamos falado (CRY, SIZE e SEARCH)."

## Abordagem
Renderizar as telas FireRed a partir da **própria ROM** (tiles, tilemaps, paletas, fontes) com um mini renderer GBA (`apps/client/lib/gba/`), portando o layout do código FRLG (janelas, ListMenu, textos). Os assets são localizados por conteúdo (`tools/asset-extractor/locate_ui.py`, pret só como chave) e exportados para `local-assets/extracted/firered/assets/gba-ui/` (git-ignored) → `public/game-assets/gba-ui/`.

## Escopo / status
- [x] Pipeline de extração (tiles, tilemaps, paletas, fontes latin normal/small, ícones de teclado, footprints 151, ícones 151, **gritos 151** decodificados do m4a → WAV, ícones de menu/tipos).
- [x] Pokédex completa da ROM: Table of Contents, Numerical/A-Z/Type/Lightest/Smallest (= SEARCH), páginas de habitat, página do Pokémon (footprint, HT/WT, descrição), página de área (mapa Kanto + marcadores + **SIZE** com silhuetas escaladas pelos parâmetros da ROM), **CRY** (Start).
- [ ] Demais telas na mesma técnica: Start menu (janela std), Party, Summary, Bag, Trainer Card, Options, Save, Town Map, Mart/PC, HUD de batalha, pós-batalha/level-up, evolução, Game Corner, título.
- [ ] Efeitos do original ainda ausentes na Pokédex: animação de virar página/zoom, scroll arrows, fade de paleta.
- [ ] Descrições da Pokédex ficam em inglês (texto da ROM); i18n dos rótulos feito (pt/es/fr no font da ROM, zh cai para inglês — a fonte não tem CJK).

## Acceptance criteria
- Cada tela portada usa gráficos/tilemaps/paleta/fonte da ROM (nenhum CSS imitando), validada por screenshot 1365×768 e ~1792×851.
- Textos via catálogo i18n (en/pt/es/fr/zh); testes verdes; typechecks.

## Riscos
Escopo enorme: um commit por tela; layouts exigem leitura do C do pret (janelas/templates); fontes sem CJK/ã/õ (fallback documentado).
