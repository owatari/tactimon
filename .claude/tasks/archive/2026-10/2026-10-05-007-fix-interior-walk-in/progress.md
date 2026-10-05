# Progress

## 2026-10-05 — investigação (headless Edge/Playwright contra dev server :3000)
- [x] Walk-in a partir de (x, y+1) para 75 portas exteriores (10 cidades): 71 OK; 4 falhas são gates esperados (Viridian Gym, Cerulean Cave, Cinnabar Gym, cerulean-house2 30,11). Também OK com locale pt-BR e 43/43 saídas de interiores. Oak Lab (pallet-town 16,13) entra e sai OK.
- [ ] Não reproduzido no headless. Usuário relata que no Brave dele fica "em cima da porta do laboratório" sem entrar. Extensão Chrome/Brave não disponível na sessão → sem acesso à aba dele.
- Hipóteses: servidor dev desatualizado (reiniciar), save/localStorage dele (posição em célula de porta é reposicionada para o spawn padrão), `storyHasHealthyPokemon` falso engolindo o warp, erro de fetch em loadMap (ver console).
Próximo: pedir console/localStorage do Brave após reiniciar `pnpm dev`; se persistir, instrumentar loadMap/pendingWarp.
