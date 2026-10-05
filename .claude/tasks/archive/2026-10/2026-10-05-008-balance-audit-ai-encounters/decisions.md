# Decisions

- Pack selvagem: "range do encontro" = [min,max] dos níveis dos slots do mapa; "overlevel" = nível ≥ max+10, "muito overlevel" ≥ max+20; abaixo de min = 1; dentro do range (até max+9) = 1–2. Soma por Pokémon vivo da party, teto 10 (grid); surf continua com teto 4.
- Ginásios: `fillGymLeaderParty` (trainers.ts) completa líderes (badgeId + mapId *-gym) até 6 com extras temáticos de `GYM_LEADER_EXTRA_PARTY`, níveis clamped ao range original; extras entram antes do ás original (último membro) para manter o prêmio FireRed (baseado no último). Elite Four/Champion não tocados. Trainers comuns intactos.
- IA: auditoria mostrou score greedy de 1 ply sem custo de exposição. Adicionado `aiRetaliationRisk` (penaliza terminar a ação onde inimigos matam/ferem muito; KO remove o alvo do risco). Autobattle já reutilizava `resolveSimpleAiTurnDetailed` (nada a unificar).
