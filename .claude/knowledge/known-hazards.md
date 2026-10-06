# Armadilhas conhecidas

- **Arquivos gerados que mudam sozinhos**: `apps/client/next-env.d.ts` (Next reescreve), `local-assets/**/world-asset-manifest.json` (extractor), `tsconfig.tsbuildinfo`. Nunca commitar junto com features.
- **`apps/client/app/battle-preview/`** é rota de debug local não versionada — não transformar em feature nem commitar por acidente.
- **Snapshot inteiro de story vindo do OverworldGame**: `storyRef` é atualizado em efeito; enviar `storyRef.current` inteiro ao `GameClient` pode sobrescrever estado mais novo (recompensas, cura). Use updaters funcionais.
- **Efeitos que reaplicam teleporte**: qualquer prop "request" (ex.: `respawnRequest`) deve ser consumida uma vez por id; efeitos re-executam em remount/Fast Refresh/StrictMode. Foi a causa dos teleports ao Pokémon Center (corrigido com `shouldApplyRespawnRequest` + `onRespawnApplied`).
- `.duel-unit` efetivo tem `transform: none` (regra tardia em globals.css) — keyframes não devem assumir `translateX(-50%)`.
- Agentes novos em `.claude/agents/` só carregam em sessão nova do Claude Code.
- **Whiteout é derivado por efeito** (`GameClient`: sem Pokémon saudável fora de batalha) — qualquer estado transitório com party toda em 0 HP dispara Pokémon Center.
- **Score de save** (`storyProgressScore`) pode preferir o backup quando o primário tem score menor (ex.: depositar no PC reduz score).
- `duel.ts` é enorme: edite com `rg -n` + ranges; rode o typecheck da engine logo após editar.
- Deny em `.claude/settings.json` bloqueia leitura de `node_modules/**` também via Bash (`ls`).
- Git Bash no Windows: heredocs longos com aspas podem falhar; prefira a ferramenta Write.
- **`loadMap` precisa ser estável** (`OverworldGame`): o efeito de montagem depende dele; qualquer dependência instável (ex.: `showInteraction`, que muda com `onDialogueInteraction`) recarrega o mapa a cada update de story (resetava boulders/posição). Use refs.
- **`extract-kanto-data.py`**: `gLevelUpLearnsets[0]` aponta para a lista do Bulbasaur; a tabela é achada pelo 2º ponteiro (bug antigo deixava cada espécie com o learnset da anterior). Os `assert` de Pikachu/Charmander protegem.
- **`apps/client/scripts/generated-sync.json`** é gerado e versionado: commitar junto com mudanças em `generate-world-maps.py`.
- **Auditoria de alcance por célula**: `tests/world-reachability.test.ts` cobre mapas inteiros + Mansion/Cinnabar/elevador; ao importar mapas/portas novos, teste também as células dos NPCs/trainers (gyms com portas/spinners podem ficar inalcançáveis).
- Git Bash: heredoc Python grande com `'''` pode falhar no parser da tool; use Write/Edit. Arquivos TS do repo estão em CRLF: scripts de patch devem normalizar `
`.

## Arena de batalha: unidades fora do tile (corrigido, task 028)
- O grid de batalha usa trilhas fixas em px (tile × zoom) e as unidades ficam em % da camada `.duel-units-layer`. Se algum CSS encolher o shell (`max-height: 100%` de `.clean-arena` dentro do `.battle-arena-scroll`), a camada fica menor que o grid e os sprites "derivam" para cima (o grid de movimento aparece longe do sprite). Agora crop/grid/unidades compartilham um box em px (`arenaBox` em `FirstBattle`) e `max-height: none !important` no shell; E2E E11 confere cada unidade na sua célula.
- Sprites grandes (Onix, Gyarados, Articuno) PODEM passar de 1 tile: não limitar a escala em `spriteLayout.ts` (tentativa da task 024 revertida).
