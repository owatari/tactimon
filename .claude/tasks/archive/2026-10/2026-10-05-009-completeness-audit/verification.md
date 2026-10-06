# Verification — relatório de completude

| Área | Como verifiquei | Resultado |
| --- | --- | --- |
| Warps (860 células, todas as tabelas) | `tests/content-integrity.test.ts`: destino é mapa registrado e spawn dentro do layout | OK |
| Retorno de portas | varredura ida/volta (dest. com warp de volta ≤3 tiles) | 859/860 OK; única exceção `seafoam-islands-b-3f:23,9 → b-2f` (sem retorno; provável buraco/escada da ROM — verificar) |
| Trainers (parties) | species/moves/níveis válidos, mapa existe | OK |
| Encontros terrestres/água/pesca | espécies e mapas válidos | OK |
| Dex 1–151 obtenível | união de encontros, água, estáticos, trocas, prêmios, gifts, starters + evolução | Faltam só exceções ROM-fiéis (abaixo) |
| Portas exteriores (10 cidades) | Edge headless: 75 portas; save novo, pt-BR e fim de jogo | 74–71 OK; falhas = gates esperados |
| Saídas de interiores | 43 amostras | 43/43 OK |
| Key items | cada id tem fonte de concessão no código | OK (16/16) |
| Início da história | save novo: Pallet → Oak Lab → tela "Choose your first Pokémon" | OK |
| `pnpm test` / typechecks | raiz 80 arq./418 testes; engine 9/215; typecheck client e engine | OK |

## Espécies não obteníveis (todas explicáveis)
- Lendários/míticos (raids futuras): articuno, zapdos, moltres, mewtwo, mew.
- Exclusivos LeafGreen (a ROM é FireRed): sandshrew/sandslash, vulpix/ninetales, bellsprout/weepinbell/victreebel, magmar, pinsir.
- Só Sevii (fora de escopo): ponyta/rapidash (ROM: Mt. Ember e Kindle Road).
- Sem tabela selvagem na ROM FireRed: slowpoke/slowbro, staryu/starmie — **decisão de produto pendente** (ver abaixo).

## Lacunas / achados
1. Slowpoke/Slowbro e Staryu/Starmie inalcançáveis (nem trocas/prêmios). Sugestão: dar fonte (ex.: Seafoam/pesca ou prêmio do Game Corner).
2. Linhas LeafGreen e Ponyta/Rapidash inalcançáveis por design da ROM; Dex completa só via trocas entre players (MMO).
3. UI: tela de escolha do inicial usa cartões arredondados estilo SaaS, contra a regra FireRed (pixel art, sem cards) — corrigir em task de UI.
4. Seafoam b-3f 23,9 sem retorno.
5. NÃO coberto: walk-through completo até a Liga com saves em todos os estágios (só início + amostragem de portas); batalha de ginásio 6v6 sem screenshot; Fase E (MMO) pendente.
