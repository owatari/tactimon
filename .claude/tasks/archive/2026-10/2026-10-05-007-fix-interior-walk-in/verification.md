# Verification

- Headless Edge (porta 3100, save novo sem starter): pallet-town 16,14 → ↑ → oak-lab. OK (antes do fix ficava na porta).
- `pnpm exec vitest run tests`: 78 arquivos / 405 testes OK; engine 211 OK; typecheck client e engine OK; `git diff --check` limpo.
- Sweep anterior: 74/75 portas OK com save de fim de jogo (falha = Cerulean Cave, gate esperado).
