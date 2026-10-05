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
