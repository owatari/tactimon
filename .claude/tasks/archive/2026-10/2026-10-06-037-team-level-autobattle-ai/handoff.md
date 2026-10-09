# Handoff 037
- `planTeamTurn` (duel.ts) distribui alvo/golpe pelo time; `scoreAiCandidate` dá bônus ao alvo designado. `teamPlanning:false` volta ao comportamento antigo.
- Testar: `pnpm --filter @tactimon/battle-engine exec vitest run test/ai-team.test.ts`.
- Pendência: `world-reachability.test.ts` falha (independente); e2e playthrough 14/14 não rodado aqui.
