# Plano — Menu Start completo + roadmap de implementação do FireRed

## Objetivo
Entregar o menu Start estilo FireRed (Pokédex, Pokémon, Bag, Trainer Card, Save, Option, Exit) com Party, tela de resumo individual, Bag com bolsos, Trainer Card e Opções, e abrir o roadmap das fases seguintes do jogo completo (pré-MMO). Esta task cobre **Fase A (menus e sistemas base)**; as fases B–E viram tasks filhas.

## Estado atual (investigação mínima)
- Não existe menu in-game: só overlays isolados (`StorageOverlay`, `MartOverlay`, `ProgressionOverlay`, bolsa de batalha em `FirstBattle`). Input em `OverworldGame.tsx` (~l.1444, keydown). Não há tela de configurações (apenas `lib/music.ts`).
- `StoryState` já guarda party (`playerPokemon`+`capturedPokemon`), box, inventory (Potion/Poké Ball), `bagItems` (itens da task 002), key items, badges, dinheiro, field techniques, saves em localStorage.
- Engine: itens de batalha só Potion/Poké Ball; ~60 espécies; sem Pokédex, Bike, Fishing, Surf, PC items, trades.

## Fases do roadmap (tasks filhas, criar via /new-task)
- **A (esta task)**: menu Start, Party, Summary, Bag, Trainer Card, Options, Save, atalhos; sistema de itens unificado.
- **B**: Pokédex (visto/capturado), uso de itens (campo + batalha: cura, status, Revive, Repel, Escape Rope, Rare Candy, pedras), moves HM/TM de campo (Cut/Flash/…).
- **C**: mecânicas faltantes: Bike, Old Rod/fishing, Surf, Day Care, trocas in-game, tutors, Town Map, eventos adiados da task 002.
- **D**: conteúdo Kanto restante (Saffron→Cinnabar→League) mapas/trainers/gyms/eventos, espécies 1–151 completas.
- **E**: preparação MMO (estado por player no servidor, contas, sincronização, anti-cheat) — só planejar.

## Escopo da Fase A
1. `lib/gameMenu.ts`: estado/ações do menu (abas, cursor), puro e testável.
2. `components/StartMenu.tsx` (pixel art FireRed, teclado: Enter/Esc/setas, X/Z): abre com Enter/Start no overworld, pausa o jogo.
3. **Party**: lista com HP/nível/status, trocar ordem, ver resumo, itens de cura quando existirem.
4. **Summary**: stats, tipos, golpes (PP), XP/próximo nível, natureza/EVs se existirem, retrato PMD/sprite FireRed.
5. **Bag**: bolsos Items / Key Items / Poké Balls (/ TMs&HMs reservado vazio) — ler `inventory`+`bagItems`+`keyItemIds`; usar/descartar onde suportado; ordenação.
6. **Trainer Card**: nome, dinheiro, badges (8 slots), tempo de jogo, Pokédex (placeholder até fase B), starter.
7. **Options**: velocidade de texto, volume música/SFX, mute, modo de batalha (animações on/off), botão de correr (toggle/hold), moldura/estilo; persistir em localStorage com normalização.
8. **Save/Exit**: salvar manual (feedback), voltar ao título.
9. Menus acessíveis também de dentro da batalha (bag/party já existentes) reaproveitando componentes.

## Acceptance criteria
- [ ] Enter/Start abre o menu no overworld; Esc/B fecha; navegação por setas; jogo pausa e retoma sem perder estado.
- [ ] Party mostra até 6 Pokémon com HP/nível/status corretos; reordenar persiste no save.
- [ ] Summary exibe stats/golpes/PP/XP de cada Pokémon (party e box).
- [ ] Bag lista todos os itens do save por bolso, com quantidades; itens de `bagItems` e key items aparecem.
- [ ] Trainer Card exibe dinheiro, badges conquistadas, tempo de jogo, starter.
- [ ] Options persistem (localStorage), aplicam volume/velocidade de texto/correr e carregam em saves antigos (defaults).
- [ ] Visual FireRed: pixel art, `image-rendering: pixelated`, sem gradients/glass; screenshots 1365×768 e ~1792×851.
- [ ] Typechecks (engine + client) ✓; `pnpm test` ✓; testes novos para estado do menu, reordenação, normalização de Options e saves antigos.
- [ ] Roadmap B–E registrado como tasks `planned` no INDEX.

## Arquivos prováveis
`apps/client/components/{StartMenu,PartyScreen,PokemonSummary,BagScreen,TrainerCard,OptionsMenu}.tsx`, `apps/client/components/{GameClient,OverworldGame}.tsx` (input/pausa), `apps/client/lib/{gameMenu,options,story,storyPersistence,items,music}.ts`, `apps/client/app/globals.css`, `tests/{game-menu,options,party-reorder}.test.ts`.

## Riscos
- Conflito de teclas (Enter já interage/avança diálogo; R alterna run) → definir Start=Enter só quando sem diálogo, ou Esc/Tab.
- Escopo enorme ("jogo completo") → fatiado em fases; não tentar B–E nesta task.
- `story.ts` grande/CRLF: normalização retrocompatível obrigatória.
- Itens de `bagItems` ainda sem efeito → UI deve marcar "não utilizável ainda".
- Validação visual exige browser (indisponível em sessões anteriores).

## Testes
Unit: reducer do menu, reordenar party, agrupar bolsos, normalizeOptions, migração de save sem `options`. Manual+screenshot: fluxo Start→Party→Summary→Bag→Card→Options→Save.

## Ordem de commits
1. `feat: add options state and persistence`
2. `feat: add start menu shell and input handling`
3. `feat: add party screen and pokemon summary`
4. `feat: add bag screen with pockets`
5. `feat: add trainer card and save/exit entries`
6. `test: cover game menu flows`
7. `chore: register roadmap tasks B-E`
