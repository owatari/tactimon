# Verification — 021
- Engine 232/232 (nickname). Client: `tests/capture-choice.test.ts` (7: hold/persistência, team, box, swap, caixa cheia, apelido). i18n ok. `pnpm test`: 91 arquivos/491 testes. Typecheck 0 erros.
- `pnpm e2e:walkthrough` 8/8 (novo E8: tela de captura abre sem página Pokédex, apelido + team salvos).
- Screenshots 1365×768 (tela com apelido) e 1792×851 (lista de troca com party cheia) conferidos; fluxo party cheia → swap → box verificado no save.
- Captura real em batalha (Auto) não simulada ponta a ponta; o gancho (`holdCapturedPokemon` no `handleBattleComplete`) é coberto por typecheck + E8.
