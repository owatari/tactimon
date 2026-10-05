# Plano — Polish: save limpo, FX de combate, HMs por party, Cycling Road, i18n (5 idiomas), UI FireRed

## Objetivo
Resetar o save local, bugfix da evolução (Pidgey→Pidgeotto em loop), FX de golpes + números de dano flutuantes, HMs de campo derivados da party, Cycling Road, lendários/míticos como raid "em breve", jogo todo em inglês com troca automática para pt-BR/es/zh/fr e UI mais fiel ao FireRed.

## Escopo e ordem de commits
1. **Reset de save**: ação "Novo jogo / apagar save" (Options) limpando `tactimon.story.v1`, `.backup`, `tactimon.position.v1`, run-mode, com confirmação; ajuda para o usuário rodar. (Não apagar o localStorage do usuário automaticamente sem confirmação — ele aciona.)
2. **Bug da evolução**: reproduzir com save de Pidgey Lv.17→18 (teste em `progression`/`BattleResultsScreen`/`PokemonEvolutionOverlay`): a tela de evolução reabre porque a evolução não é consumida/persistida (fila `pendingEvolutions` ou `evolutions` do reward). Corrigir + teste de regressão + normalização de saves já travados.
3. **Lendários/míticos = raids futuras**: `STATIC_WORLD_ENCOUNTERS` (Zapdos, Articuno, Mewtwo) e gate do fantasma continuam; trocar `wildBattle` por diálogo "Raid — coming with the MMO". Snorlax continua batalha normal. Teste.
4. **HMs por party** (Cut, Surf, Strength, Flash, Fly, Rock Smash): `fieldTechniques.ts` passa a exigir "algum Pokémon da party consegue usar" (tabela espécie→HMs compatíveis, extraída da ROM `gTMHMLearnsets` ou heurística por tipo) + insígnia; o item/HM do NPC vira apenas desbloqueio (key item). Implementar Rock Smash (rochas `ROCK_SMASH_ROCK` no gerador de obstáculos, HM do Sevii substituída por presente em Kanto, ex.: Rock Tunnel/Route… — decidir em decisions.md). Testes.
5. **Cycling Road**: gates nas gatehouses Route 16/18 (exigir Bicycle; descida forçada em velocidade), encounters, texto; teste de alcance.
6. **FX de combate + números de dano**: floating damage numbers (+cura, crítico, super effective, miss) em `FirstBattle.tsx`/`BattleVfx.tsx`; FX por categoria/tipo de golpe (projétil, contato, status, área) usando assets PMD já extraídos, sem esticar sprites; velocidade 1x/2x respeitada. Screenshots.
7. **i18n**: camada `lib/i18n` (en padrão; pt-BR, es, zh-Hans, fr), catálogo por chave com fallback en, `useT()`/`t()`, detecção automática (`navigator.language`) + opção no Options + persistência, troca em tempo real sem reload. Migrar todos os textos existentes (diálogos, UI, trainers, NPCs, placas, itens, golpes, espécies) para chaves/catálogos; hoje o texto fonte é pt-BR + EN da ROM: inverter para EN como base e manter pt-BR. Textos de conteúdo futuro entram só por catálogo (regra documentada + teste que falha se faltar chave en). Fontes para zh (CJK) sem quebrar pixel-art.
8. **UI FireRed**: revisar Start Menu, diálogo, bag, party, mart, Pokédex, Town Map, battle HUD (moldura 9-slice, fonte pixel, cursor ▶, cores, HP bar) — em cima do pokemon-ui skill; sem gradients/glass.
9. Docs/knowledge + arquivar.

## Acceptance criteria
- [ ] Botão de reset funciona; save novo começa em Pallet sem estado antigo (teste de normalização + validação manual).
- [ ] Pidgey Lv.18 evolui uma única vez, overlay não reaparece após fechar nem após reload; teste cobre save "travado".
- [ ] Interagir com Zapdos/Articuno/Mewtwo mostra aviso "future raid" e nunca inicia batalha.
- [ ] HM de campo funciona com party compatível sem ensinar golpe; sem compatível mostra mensagem; Rock Smash quebra rochas.
- [ ] Cycling Road: sem Bicycle bloqueado, com Bicycle atravessa; teste de alcance.
- [ ] Números de dano aparecem para dano/cura/miss/crit em ambos os lados; FX diferenciados por tipo de golpe; screenshots 1365×768 e ~1792×851.
- [ ] Idioma padrão EN; trocar para pt-BR/es/zh/fr atualiza toda a UI/diálogos sem reload; auto-detecta navegador; teste de cobertura de chaves.
- [ ] UI revisada validada por screenshots; typechecks e `pnpm test` ✓; sem sujeira local versionada.

## Arquivos prováveis
`apps/client/lib/i18n/*` (novo), `lib/*Text*.ts`, `questDialogues.ts`, `dialogueSystem.ts`, `worldTexts*.ts`, `trainerTexts*.ts`, `fieldTechniques.ts`, `staticEncounters.ts`, `scriptedWorldObjects.ts`, `questGates.ts`, `components/FirstBattle.tsx`, `BattleVfx.tsx`, `StartMenu.tsx`, `OverworldGame.tsx`, `PokemonEvolutionOverlay.tsx`, `BattleResultsScreen.tsx`, `globals.css`, `tools/rom-data/generate-world-obstacles.py`.

## Riscos
Escopo enorme (i18n toca milhares de strings; considerar subtasks e geração em lote com revisão); fonte CJK vs pixel-art; perda de save se reset sem confirmação; mudar HMs para party quebra saves antigos (manter fallback por key item); desempenho de FX no combate.

## Testes
vitest para evolução, raids, HMs/party, Cycling Road, i18n (chaves/fallback/detecção); screenshots via Edge headless (ver knowledge/testing.md).
