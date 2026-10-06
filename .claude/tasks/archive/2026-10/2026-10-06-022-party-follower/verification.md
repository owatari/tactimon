# Verification — 022
- `tests/follower.test.ts` (6): trilha de 1 tile com mesma duração, passo tratado uma vez, troca de lugar, facing, primeiro vivo/oculto, visibilidade (surf/transição/cena do inicial).
- Typecheck client 0 erros; `pnpm test` 92 arquivos/497 testes + engine 232.
- `pnpm e2e:walkthrough` 9/9 (novo E9: `.party-follower` aparece e fica visível). Screenshots 1365×768 (andando para leste: Charmander atrás, virado para a direita) e 1792×851 (andando para cima: Charmander atrás, virado para cima).
- Armadilha achada: aba headless `hidden` para o RAF → corrigido no harness (testing.md).
