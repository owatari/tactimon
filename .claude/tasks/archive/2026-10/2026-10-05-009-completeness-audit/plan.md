# Plan — 2026-10-05-009-completeness-audit

## Objetivo
Auditar se o jogo está completo (Kanto FireRed, exceto exceções acordadas) e produzir um relatório objetivo de lacunas; corrigir lacunas pequenas e transformar as grandes em tasks.

## Exceções acordadas (não são lacunas)
TMs/Held Items (raids/dungeons), lendários/míticos (só aviso de raid), Sevii Islands, Waterfall, elevadores Silph/Dept. Store (escadas), Fase E (MMO) e saves só locais. Registrar qualquer outra exceção que o usuário confirmar.

## Escopo da auditoria
1. **Conteúdo vs ROM** (script em `tools/`/scratchpad, lendo só dados gerados já versionados + ROM local quando necessário): mapas Kanto (mainland), warps, NPCs/placas, trainers (contagem e parties vs `gTrainers`), líderes/E4/Champion, encontros (grama/água/pesca/estáticos), itens (bolas/hidden), marts, gifts/trocas/tutors, espécies 1–151 (golpes/evoluções), badges/HMs.
2. **Progressão da história** com saves semeados em estágios (novo sem inicial, pós-inicial, 0/2/4/8 badges, pós-Liga, party toda desmaiada, party cheia + box): script Playwright (Edge headless, dev server) + testes vitest de lógica: entrar/sair de interiores, gates (Oak/Route 22, Viridian Gym, Cut/Surf/Strength/Flash, Silph, Rocket, Safari, Cycling Road, Cerulean Cave), batalhas (selvagem/trainer/ginásio 6), captura, evolução, whiteout, Day Care, trocas.
3. **Riscos de estado de save**: normalização de saves antigos, reset, locale; guards que dependem de `starter`/party (como o bug de walk-in da task 007).
4. **Qualidade**: grep de textos sem i18n, mapas sem warp de volta, NPC sem texto, trainers sem sprite, ids duplicados.

## Entregáveis
- `verification.md` com tabela: área → verificado como → resultado (OK/lacuna/exceção).
- Lista priorizada de lacunas; correções pequenas aplicadas (commits pequenos); lacunas grandes viram `/new-task` separadas.
- Scripts reutilizáveis de auditoria (se úteis) versionados em `tools/audit/` ou como testes em `tests/`.

## Acceptance criteria
- [ ] Relatório cobre todas as áreas do escopo com evidência (comando/resultado).
- [ ] Cada exceção acordada listada e conferida como realmente ausente/avisada (ex.: lendário só avisa).
- [ ] Walk-through scriptado completa a história principal (do inicial à Liga/Champion) ou registra exatamente onde bloqueia.
- [ ] Todos os mapas mainland alcançáveis (teste existente) + portas de ida e volta consistentes.
- [ ] Contagem de trainers/itens/encontros por mapa confere com os dados da ROM (diferenças explicadas).
- [ ] Nenhuma regressão: typechecks + `pnpm test` verdes.
- [ ] Conclusão final honesta: "completo salvo X" ou lista de lacunas.

## Arquivos prováveis
`tests/*` novos de integridade, `tools/audit/*` (novo), `apps/client/lib/*` só para correções pequenas, `.claude/knowledge/*` se descobrir algo estável.

## Riscos
- Escopo grande: usar até 2 agentes em paralelo (`gameplay-systems`, `repo-cartographer`) e checkpoints frequentes em `progress.md`.
- Ler ROM/`local-assets` é pesado: só via scripts em `tools/rom-data`, nunca varrer manualmente.
- Walk-through completo é lento: dividir em segmentos por saves semeados.
- Não versionar sujeira local (`local-assets/**`, `next-env.d.ts`).

## Testes necessários
`pnpm test`, typechecks, novos testes de integridade e execução dos scripts Playwright (screenshots só como evidência em scratchpad).

## Ordem de commits
1. `test: content integrity checks vs generated ROM data`
2. `test: seeded-story progression audit` (se versionável)
3. `fix: <lacunas pequenas>` (um por lacuna)
4. `docs: completeness report in knowledge` + `chore: archive task`
