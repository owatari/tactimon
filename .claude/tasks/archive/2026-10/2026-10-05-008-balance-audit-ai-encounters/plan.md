# Plan — 2026-10-05-008-balance-audit-ai-encounters

## Objetivo
Auditar e ajustar o balanceamento: (1) tamanho dos packs selvagens por party, (2) tamanho das equipes de ginásio (sempre 6, level range intacto), (3) IA inimiga/trainer e autobattle mais deliberadas (avaliar antes de agir). Trainers comuns: intocados.

## Achados da investigação mínima (base_head e0c64e77)
- Packs selvagens: `apps/client/lib/wildEncounters.ts` → `equivalentWildPartyStrength` (soma `(nível/areaLevel)^2.2`, clamp 0.35–4.5 por Pokémon) + `resolveWildPackSize` (faixas 1–2 … 8–10 pela força total). Um único Pokémon no nível da área já cai em 2–4 e overlevel chega a 8–10 → origem dos "8 Pidgeys". A regra pedida (por Pokémon) foi perdida.
- Ginásios: `apps/client/lib/trainers.ts` (`mapId: "<cidade>-gym"`, líderes autorais; Brock com 2 Pokémon) e `generated/worldTrainers.ts` (líderes extras da ROM).
- IA: `packages/battle-engine/src/duel.ts` — `scoreAiCandidate`, `chooseAiCandidate`, `compareAiCandidates`, `aiBestIncomingDamage`, `chooseAiItemAction`, `aiMovementDestination`. Autobattle: `components/FirstBattle.tsx` (`autoBattle`, ~L1450–1480).

## Regra de pack selvagem (nova, por Pokémon da party)
Para cada Pokémon da party com nível L e faixa do encontro [min,max] (mapa): "no level range" = L dentro de [min−?, max+?] (definir/registrar em decisions.md; padrão: min ≤ L ≤ max+9).
- underlevel (L < min): contribui **1**.
- no range e L < max+10 (até +9 acima do teto): contribui **1–2** (roll determinístico).
- overlevel (L ≥ max+10): **2** fixo.
- muito overlevel (L ≥ max+20): **2–3**.
- Soma sobre toda a party (levels vivos), com teto de segurança razoável (ex.: ≤ 10–12, respeitar limite do grid/spawn) — confirmar com o usuário só se o teto afetar a regra.
- Party de 1 Pokémon no range ⇒ 1–2 selvagens (nunca 8).

## Ginásios
- Todo líder de ginásio com **6 Pokémon**; mexer só no tamanho do time (adicionar membros coerentes com tema/tipo e dentro do **mesmo level range** do líder — não subir nível além do range existente). Cobrir autorais (`trainers.ts`) e gerados (`worldTrainers.ts`/gerador `tools/rom-data/generate-world-content.py` se o TS for gerado — alterar o gerador/overrides, não só o TS). Elite Four/Champion fora do pedido: registrar e não mexer.
- Trainers comuns: não alterar.

## IA (inimigos, trainers, autobattle)
- Auditar `scoreAiCandidate`/`chooseAiCandidate`: avaliar dano esperado, KO, risco recebido (`aiBestIncomingDamage`), cobertura de tipo, status utility, posicionamento e uso de itens; evitar ações greedy/ruins (ex.: golpe sem efeito, mover para cair em alcance, curar sem necessidade, ignorar KO disponível). Introduzir "lookahead leve" determinístico (comparar candidatos por valor líquido = dano causado − ameaça residual, desempate estável) sem quebrar seeds/testes existentes.
- Autobattle (`FirstBattle.tsx`): reutilizar a mesma avaliação para o time do jogador (hoje divergente?) — verificar e unificar via engine se possível.
- Produzir relatório curto dos problemas achados em `decisions.md`.

## Acceptance criteria
- [ ] Teste unitário de `resolveWildPackSize`/novo cálculo: 1 Pokémon no range → 1–2; underlevel → 1; +10 → 2; +20 → 2–3; party de 6 soma por Pokémon; determinístico por roll.
- [ ] Nenhum pack > teto definido; Bulbasaur L5 na Route 1 gera 1–2 selvagens.
- [ ] Todos os ginásios (8 líderes) têm exatamente 6 Pokémon, níveis dentro do range original do líder; teste varrendo os líderes.
- [ ] Trainers comuns inalterados (teste de snapshot/contagem existente passa).
- [ ] IA: testes de engine novos para ≥4 decisões (pega KO disponível, evita golpe imune/ineficaz, não cura com HP alto, escolhe alvo de maior valor) e seeds existentes sem regressão (ajustar expectativas só se justificado).
- [ ] Autobattle usa a mesma lógica de decisão; sem loop/travamento.
- [ ] Typechecks (engine + client) e `pnpm test` sem falhas novas; sem texto novo sem i18n.
- [ ] Validação visual de uma batalha selvagem e de um ginásio (1365×768 e ~1792×851): 6 Pokémon do líder cabem no grid/spawn.

## Arquivos prováveis
`apps/client/lib/wildEncounters.ts`, `apps/client/lib/trainers.ts`, `apps/client/lib/generated/worldTrainers.ts` (+ gerador em `tools/rom-data/` e overrides), `packages/battle-engine/src/duel.ts`, `apps/client/components/FirstBattle.tsx`, `apps/client/components/OverworldGame.tsx` (chamada do pack), testes em `tests/` e `packages/battle-engine/test/`.

## Riscos
- Mudar IA altera seeds/resultados dos testes de engine; manter determinismo.
- Líder com 6 Pokémon exige espaço de spawn/grid; checar `spawn-placement`.
- Gerador sobrescreve TS gerado → alterar na fonte (overrides).
- Pack grande de party de 6 (soma por Pokémon) pode estourar grid; teto necessário.
- Dificuldade de ginásios sobe: conferir que XP/level curve do jogo comporta (apenas registrar).

## Ordem de commits
1. `fix: per-party-member wild pack size` (+ testes)
2. `feat: six-Pokémon gym leaders` (+ testes)
3. `feat: deliberate enemy/trainer AI scoring` (+ testes engine)
4. `feat: autobattle uses engine decision logic`
5. `docs: knowledge update` + `chore: archive task`
