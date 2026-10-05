# Handoff

Causa: guard de HP engolia o warp quando o save não tinha Pokémon (save novo → porta do Oak Lab). Fix: `storyIsKnockedOut` em `lib/story.ts`, usado em `OverworldGame.tsx` (2 pontos). Teste: `tests/interior-walk-in.test.ts`.
Como testar: limpar save, andar até a porta do Oak Lab em Pallet Town.
Pendências: nenhuma.
