# UI e direção de arte

- Referência: FireRed. Caixas com borda sólida escura + inset claro, fundo creme (`#fffceb`/`#f8f8f8`), texto escuro, fonte pixel. Sem gradients modernos, glassmorphism, blur, cards SaaS, sombras difusas.
- CSS global único: `apps/client/app/globals.css` (~5.8k linhas) — localizar por classe com `rg`. Prefixos: `.battle-*`, `.pokemon-battle-sprite*`, `.overworld-*`, `.hud*`, `.progression-*`, `.blackout-*`.
- Batalha: arena em grid, HUDs de time nos flancos, turn order com portraits PMD (`PokemonPortrait.tsx`). Nomes: aliado local preto, outro player azul, inimigo vermelho. Status múltiplos devem caber.
- Sprites: `PokemonBattleSprite.tsx` + `lib/spriteLayout.ts` — escala pelo corpo visível do idle (`bounds` do manifest; ≥ 1 tile, grandes crescem sub-linearmente: Onix ~2,2), mesma escala em todas as animações, frame ancorado pelo ponto de chão PMD (`groundX/groundY` = centro do frame + ~4 px) em `SPRITE_GROUND_Y` do tile. Nada de tabela de escala por espécie no CSS.
- Viewport de batalha coerente com overworld; tudo deve caber em 1365×768 e ~1792×851.
- Validação: skill `pokemon-ui` (`screenshot.mjs` via Edge headless/CDP). Rota de debug local `/battle-preview` existe só no working tree local (não versionada).

## Start menu (task 2026-10-04-003)
- `components/StartMenu.tsx` + `lib/gameMenu.ts` (lógica pura testável) + `lib/options.ts` (localStorage `tactimon.options.v1`, fora do save). Abre com Esc/Tab/M no overworld (`OverworldGame.onMenuOpen`), pausa via `paused` do `GameClient`; teclas do menu: setas/WASD, Enter/Z/E confirma, Esc/X/Tab/M volta.
- Líder da party é fixo (tipo `CapturedPokemon` ≠ starter): reordenar só slots 2–6. Bag: bolsos Items/Key/Balls + TMs e Berries reservados (dungeon/raid). `playTimeSeconds` no save (flush a cada 30 s e ao abrir o menu).
- Sem browser nas sessões anteriores: layout do menu **não validado por screenshot**.

## i18n e casca FireRed (task 006)
- `lib/i18n`: inglês é a fonte; catálogos por domínio em `catalog/*.ts` (chave = texto inglês; texto pt legado mantém o literal pt como chave com `en`); `t()` traduz na exibição, `runDialogueInteraction` localiza páginas/speakers/escolhas; idioma = `tactimon.lang.v1` ou `navigator.languages`; `useLocale()` re-renderiza.
- Nomes: `namesData.ts` (fr/zh espécies; pt/es/fr/zh golpes) + `localizedSpeciesName/MoveName/localizeKnownNames`; log da engine é estruturado (`state.logData` template+params) e localizado em `localizeLogEntry`.
- Casca: sem cabeçalho/rodapé web; viewport 100dvh; caixa de texto cream com ▼; banner de mapa temporário; telas do menu limitadas a 960px.
- Combate: números flutuantes (`battle-floater`), FX por tipo (`.fx-<type>` CSS) quando não há sprite PMD, projétil atacante→alvo.

## HUD e janelas do jogador (task 038)
- `PlayerHud` (no OverworldGame, escondido quando `paused`): 6 botões redondos (Pokédex/Mapa/Pokémon/Bag/Card/Options, atalhos 1–6) abrem o `StartMenu` direto na tela (`initialScreen`; voltar fecha tudo). Canto inferior direito: RUN/WALK (R), BACK (Esc), INTERACT (E) — enviam as mesmas teclas do teclado. Esc continua abrindo o menu-lista (fallback).
- Drag and drop: `components/dragDrop.tsx` (`useDragDrop`, baseado em pointer events — funciona com mouse/touch e com `Input.dispatchMouseEvent` do CDP; HTML5 drag não). Fonte: `dragProps(payload, ghost)`; alvo: `data-drop-kind`/`data-drop-id`. Clique sem mover continua clique. Sempre há alternativa sem arrastar (clique/MOVE/Enter).
- Janelas: `PokemonWindow` (hover = Summary lateral via cursor do bridge, clique fixa, golpes arrastáveis; líder travado), `PcWindow`, `BagWindow` (grade 6 colunas, usar item = arrastar sobre Pokémon), `MarketWindow`. CSS `pokemon-window-*`, `pc-*`, `bag-*`, `market-*` em globals.css. Armadilha: `font: 700 12px/1 inherit` é inválido (descarta a regra) — use `font-family: inherit`.
- Botões dentro de `.start-menu-overlay`/`.mart-overlay` entram no bridge de input (setas movem foco, Enter clica, Esc = `[data-input-back]`); `data-input-native` evita o confirm automático do clique.

## Pokédex própria (task 039)
- `PokedexWindow` (DOM) é a tela do botão Pokédex/menu; a Pokédex GBA fiel (`PokedexGba`) virou "Classic mode" (botão `[data-dex-classic]`). Lista 151 + busca + filtros ALL/SEEN/CAUGHT; abas INFO / LOCATIONS / MOVES / TMs / STATS (←→ trocam aba, ↑↓ andam na lista, Esc fecha).
- Visibilidade anti-spoiler: não visto = "-----"/"???"; visto = Info básica + Stats; capturado = Locais, Golpes, TMs, EV yield, taxa de captura e melhor nature. Teste: `localStorage["tactimon.dex.reveal"]="1"` libera tudo.
- Dados: `lib/pokedexData.ts` (locais = inversão de `LAND_ENCOUNTERS`/`WATER_ENCOUNTERS` com % por tabela; `STATIC_SOURCES` à mão para presentes/prêmios/fósseis/trocas/lendários-raid), `lib/generated/tmCompat.ts` (`tools/rom-data/generate-tm-compat.py`, TM01–50/HM01–08 por espécie), engine `duelSpeciesBaseStats`/`speciesEvolutions`.
- `bestNatureFor(species)` (`lib/bestNature.ts`): stat ofensivo = base × poder dos 3 melhores golpes aprendíveis (nível+TM, STAB 1.5×) por categoria; sobe o ofensivo e desce o ofensivo não usado (Adamant/Modest…); espécie ≥100 de Speed e ≥85% do ofensivo sobe Speed (Jolly/Timid); ofensiva < 55 = "bulky" (sobe a melhor defesa, desce o pior ataque).
