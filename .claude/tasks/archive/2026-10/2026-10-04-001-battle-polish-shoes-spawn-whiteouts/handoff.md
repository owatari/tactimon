# Handoff

Commits (base 1842fcfb → b0899064): spawn tático, Running Shoes, respawn one-shot, tutorial do Blue, faint sem delay, sprites por metadata, pós-batalha unificado, HUD WALK/RUN.

- Teleport ao Pokémon Center: `respawnRequest` nunca era limpo e o efeito `[loadMap, respawnRequest]` reaplicava o teleporte em qualquer re-execução (Fast Refresh no dev, remount). Agora é one-shot (id) + story updates funcionais.
- Sprites: re-rodar `pnpm dev` (sync-assets) regenera manifest com `bounds/groundX/groundY`; auditar com `node tools/sprite-importer/audit-sprites.mjs`.

Como testar: `pnpm dev`; batalha selvagem (6×10, spawn, faint, tela de resultado); perder para o Blue no lab (fica no lab, curado); Route 3 com Boulder Badge (Running Shoes, R).

Pendências / follow-ups:
- `storyProgressScore` pode preferir o backup após depositar no PC (rollback de save, não teleport) — task própria.
- Arena de batalha ocupa só parte do viewport em telas largas (MAP 3×) — avaliar em task de UI.
- Agentes de `.claude/agents/` só ficam disponíveis em sessão nova do Claude Code.
