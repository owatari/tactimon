# Progress

## 2026-10-05 — checkpoint 1
- [x] Key items (tea, silph-scope, poke-flute, card-key, lift-key, secret-key, gold-teeth, coin-case, 3 rods) + HMs strength/flash/fly (badge-gated, `fieldTechniques.ts`) — story.ts, keyItems.ts
- [x] NPCs: Fly (Route 16), Flash (Route 2 aide, 10 caught), Strength (Warden + Gold Teeth), rods (Vermilion/Fuchsia/Route 12), Coin Case, Tea, Mr. Fuji/Poké Flute — questDialogues.ts
- [x] Obstacles generated from ROM: cut trees (36), Strength boulders (25, push in OverworldGame, reset on map load), key-item balls, Snorlax/Zapdos/Articuno static battles, Silph Card Key doors (20), Saffron guards (4 gatehouses), Tower ghost gate, Cinnabar Secret Key gate — generate-world-obstacles.py, questGates.ts, staticEncounters.ts
- [x] tests/field-mechanics.test.ts (19) ✓; pnpm test 64 files ✓
Próximo: pesca/surf (generate-world-water.py já gerado, falta lib+F key), Flash darkness, Fly/Town Map, Day Care, Safari, Game Corner, trocas, tutors, Mansion, Mewtwo/Cerulean Cave, golpes especiais, textos
## 2026-10-05 — checkpoint 2
- [x] Pesca (Old/Good/Super, tecla F) + encontros de surf — 39998289
- [x] Safari Zone (₽500, 30 balls, 500 passos, auto-saída, HUD) — 6d1623e6
- [x] Day Care (depósito, 1 XP/passo, taxa por nível) — 35db1db0
- [x] Game Corner (Coin Case, moedas, 19 slots, prêmios Pokémon, gate Rocket Hideout) — 77be1170
Próximo: Flash (escuridão Rock Tunnel), Fly + Town Map (tela), trocas in-game, tutors, Mansion B1F/switches, Cerulean Cave/Mewtwo, golpes especiais, textos pt-BR de NPCs de evento
## 2026-10-05 — checkpoint 3
- [x] Flash (escuridão Rock Tunnel) + Town Map (tela via Bag) + Fly com visitas — d281f9ef
- [x] 9 trocas in-game da tabela da ROM (0x26CF8C) — dc544834
- [x] Golpes: level-damage, fixed-damage-40, multiHit "two", self-faint; 64→90 golpes gerados — engine + generate-engine-species.py
Próximo: tutors, Pokémon Mansion (B1F/switches), Cerulean Cave/Mewtwo, Silph Giovanni, textos pt-BR de eventos (Cinnabar), Cycling Road, validar mapas/gates com test de alcance, knowledge docs, arquivar C/D
