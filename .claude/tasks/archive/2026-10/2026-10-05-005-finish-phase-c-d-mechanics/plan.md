# Plano — Finalizar mecânicas restantes (Fases C e D)

## Objetivo
Implementar todas as mecânicas/eventos ainda pendentes das tasks `2026-10-05-002` (C) e `2026-10-05-003` (D), arquivar ambas como `done` e deixar só a `2026-10-05-004` (E) ativa/planned.

## Já feito (não refazer)
Mom, Daisy/Town Map item, Old Amber, Bike Voucher/Bicycle, Surf, pedras/evoluções, 151 espécies/64 golpes, 140 mapas, encontros/itens/marts/trainers, rivais (Tower, Silph, R22, Champion), gifts (Lapras, fósseis, Magikarp salesman), teste de alcance.

## Escopo pendente (1 commit semântico por item; evento sempre por player em `playerWorldState`)
Mecânicas de campo (C):
1. Day Care (depositar/retirar, XP por passo, custo).
2. Pesca (Old/Good/Super Rod + Fishing Guru) com tabelas de água.
3. HMs de campo: Cut/Strength/Flash/Fly (gates, uso do menu, Fly para town map).
4. Town Map como tela do menu/Bag.
5. Trocas in-game (Pewter, Cerulean, Route 2, Vermilion etc.) e tutors (Mega Punch/Kick, etc.).
6. Oak's Parcel/Pokédex delivery e Pewter guide, se ainda ausentes (verificar com rg antes).
Conteúdo/questlines (D):
7. Chá/Saffron guards, Silph Scope, Poké Flute, Card Key, Lift Key, Secret Key + Mansion puzzle (e Mansion B1F alcançável).
8. Pokémon Tower (fantasma/Mr. Fuji), Silph Co (Giovanni), Snorlax, aves lendárias, Mewtwo.
9. Safari Zone (taxa, 30 bolas, passos, Gold Teeth/Strength) e Game Corner (moedas, prêmios, Rocket hideout switch).
10. Textos pt-BR dos NPCs de evento (gifts, tutors, Cinnabar Lab).
11. Golpes com efeito especial que ainda faltam na engine (verificar lista vs. `kanto-moves.json`), com teste.
12. Fechar: atualizar ledger C/D (progress/handoff/verification), `knowledge/*`, arquivar C e D, INDEX.

## Acceptance criteria
- [ ] Cada item 1–11 implementado, persistido por player e normalizado para saves antigos.
- [ ] Teste vitest para cada mecânica (lib do client ou engine).
- [ ] `tests/world-reachability.test.ts` passa incluindo Mansion B1F (sem exceções).
- [ ] Typecheck engine + client ✓; `pnpm test` sem falhas novas.
- [ ] UI nova (Day Care, Town Map, Game Corner, Safari HUD, pesca) validada por screenshot 1365×768 e ~1792×851 (se browser indisponível, registrar em verification.md).
- [ ] Tasks 002 e 003 com `status: done` e movidas para `archive/2026-10`; 004 permanece `planned` em active; INDEX atualizado.

## Arquivos prováveis
`apps/client/lib/*` (story, saves, worldEvents, encounters), `OverworldGame`/`GameClient`, `components/*` (menus, HUD), `packages/battle-engine/src/duel.ts` (golpes), `tools/rom-data/*`, `tests/*`, `.claude/knowledge/*`.

## Riscos
Escopo grande (usar subagentes `gameplay-systems`/`battle-engine`, máx. 2 em paralelo); saves antigos; validação visual sem browser; scripts ROM gerados não devem poluir o repo (não versionar manifests/local-assets).

## Testes necessários
Vitest por mecânica; reachability; regressão de saves; `pnpm test` completo ao fim.

## Ordem de commits
1 Day Care → 2 pesca → 3 HMs de campo → 4 Town Map → 5 trocas/tutors → 6 key items/questlines Saffron/Mansion/Silph → 7 Tower/lendários/Snorlax → 8 Safari → 9 Game Corner → 10 golpes especiais → 11 textos pt-BR → 12 chore: archive tasks C/D.
