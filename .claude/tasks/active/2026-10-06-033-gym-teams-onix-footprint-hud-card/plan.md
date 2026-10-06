# Plan — 033 times dos ginásios, footprint do Onix e centralização do card de batalha

## Estado atual (investigado)
- Times: `apps/client/lib/trainers.ts` — party base de cada líder (`HAND_OVERWORLD_TRAINERS` + gerados) completada por `GYM_LEADER_EXTRA_PARTY` / `fillGymLeaderParty` (níveis presos à faixa original do líder; tamanho máx. `GYM_LEADER_PARTY_SIZE = 6`). Brock usa Onix (linhas ~86 e ~733).
- Onix: o sprite é dimensionado por `spriteTileSpan` (`lib/spriteLayout.ts`, Onix ≈ 2,2 tiles visuais, expoente 0,6), mas na engine (`duel.ts`, posições/colisão/`blocked`) toda unidade ocupa **1 tile**. Não existe footprint multi-tile.
- Cards da batalha: `.combatant-hud` / `.battle-combatant-sidebar` em `globals.css` (~linha 1385+) e `FirstBattle.tsx`; na screenshot (1792×851) nome, nível, tipos, HP e AP ficam deslocados/saindo do card.

## Objetivo
1. **Times novos** (exatos, nesta ordem):
   Brock: Geodude, Geodude, Rhyhorn, Onix · Misty: Staryu, Starmie, Goldeen, Seaking, Psyduck · Lt. Surge: Voltorb, Electrode, Magnemite, Magneton, Pikachu, Raichu · Erika: Tangela, Vileplume, Victreebel, Ivysaur, Exeggutor · Koga: Koffing, Koffing, Weezing, Muk, Arbok, Tentacruel · Sabrina: Kadabra, Alakazam, Mr. Mime, Golduck, Venomoth, Jynx · Blaine: Growlithe, Ponyta, Rapidash, Arcanine, Magmar, Flareon · Giovanni: Rhyhorn, Dugtrio, Nidoqueen, Nidorino ("Nidokin" no pedido = Nidorino/Nidoking, confirmar em decisions.md), Rhyhorn, Rhydon.
   (Brock/Misty/Koga/… ficam com 4–6 membros conforme a lista; só Brock/Misty/Erika têm < 6.) Níveis: curva crescente por líder dentro da faixa original (+ ligeiro escalonamento pelo último membro = ás); golpes via `defaultMovesForSpecies`; verificar que todas as espécies existem em `SPECIES` do engine.
2. **Onix 1×2**: validar a proporção real do sprite (bounds do manifest) e decidir com evidência: (a) só visual correto (sprite já ≈ 2 tiles, garantir que a âncora/shadow fique no tile de origem e que a leitura "ocupa 2 tiles" não engane), ou (b) footprint real de 2 tiles (Onix e similares: Gyarados, Dragonair, Steelix-like) na engine: ocupação, colisão, alcance, spawn, movimento, `unique-positions`. Registrar a decisão e implementar (a) no mínimo; (b) só se o custo for contido — senão abrir task própria.
3. **Card de batalha centralizado**: conteúdo (nome, Lv, tipos, HP, AP, status) alinhado e contido dentro do card em 1365×768 e 1792×851 — sem overflow, sem deslocamento para fora; retrato do lado correto; textos longos truncam com ellipsis.

## Acceptance
- [ ] Teste de dados: cada líder tem exatamente a lista pedida (espécies e ordem); níveis dentro da faixa e não decrescentes no final; todas as espécies válidas no engine.
- [ ] Batalha real contra cada líder (e2e `fightTrainer` ou teste de engine) abre sem erro com o time novo; `pnpm e2e:playthrough` 14/14 ainda verde (ginásios mais fortes/fracos: checar balanceamento e ajustar níveis se o playthrough falhar).
- [ ] Onix: laudo (medidas do sprite, decisão a/b) em `decisions.md`; comportamento coerente na arena (screenshot com Onix); se (b), testes de engine de ocupação/colisão.
- [ ] Cards: screenshot 1365×768 e ~1792×851 com 5 aliados e 5 selvagens (como a imagem do pedido) mostrando tudo contido/centralizado; teste/e2e que mede `scrollWidth <= clientWidth` e bounding boxes dos filhos dentro do card.
- [ ] i18n sem textos novos (ou 5 idiomas); `pnpm test`, typechecks, walkthrough verdes.

## Arquivos prováveis
apps/client/lib/trainers.ts (+ generated se necessário), apps/client/lib/spriteLayout.ts, apps/client/components/FirstBattle.tsx, apps/client/app/globals.css, packages/battle-engine/src/duel.ts (só se footprint real), tests/gym-teams.test.ts (novo), tools/e2e/walkthrough.e2e.ts.

## Riscos
- Mudar times dos líderes altera dificuldade e o playthrough (nível/ordem dos ases); `GYM_LEADER_EXTRA_PARTY` e `fillGymLeaderParty` precisam ser trocados por lista explícita sem quebrar `requiresBadgeCount`/prêmios (`trainerPrizeMoney` usa o último membro).
- Footprint multi-tile mexe em spawn, pathfinding, IA e posições únicas (alto risco) — manter fora do escopo se não for simples.
- CSS do card compartilhado entre sidebar jogador/selvagem e HUD; mudar sem quebrar o layout 10 selvagens.

## Testes necessários
Dados dos times; engine (se footprint); screenshots/medição dos cards; playthrough completo.

## Ordem de commits
1. `feat: new gym leader teams` (+ teste) 2. `fix: Onix footprint/anchor` (conforme decisão) 3. `fix: center battle HUD card content` 4. `docs: knowledge + archive`
