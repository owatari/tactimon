# Plano — Auditoria de paridade Kanto (Pallet → Vermilion) + limpeza do repo

## Objetivo
Limpar arquivos inúteis/poluentes do repo e auditar o conteúdo jogável já implementado contra o FireRed, produzindo uma matriz de divergências e corrigindo tudo o que já deveria existir no ponto atual da história.

## Escopo
- O pedido diz "até Cerulean", mas o código já tem Route 5/6, Underground Path, Vermilion (city, PC, Mart, Gym) e SS Anne. **Escopo de auditoria = todos os mapas em `WORLD_MAPS`** (Pallet → Vermilion/SS Anne). Interiores ausentes que o jogador já alcança por warp/borda entram como divergência.
- Exceções (NÃO são divergência): TMs e Held Items no overworld (exclusivos de dungeon/raid futuros); progressão/eventos/itens/árvores de Cut instanciados por player (`playerWorldState`/`playerWorldGates`).
- Item que no FireRed é TM/held item → registrar como omitido em `decisions.md`, não adicionar.

## Achados iniciais (investigação mínima)
- `lib/overworldPickups.ts` tem só 4 pickups (Viridian City ×1, Viridian Forest ×3). Faltam os itens de Route 2/3/4/22/24/25/6, Pewter, Mt. Moon (vários + fóssil), Cerulean, Vermilion, SS Anne e os itens ocultos.
- Interiores ausentes em `maps.ts` (verificar um a um): casa do player e casa do Rival (Pallet), Viridian (School, casa, Trainer House), Pewter (Museum, casas), Route 2 (casas/trade), Cerulean (Bike Shop, casas, casa roubada, Badge/Trade house), Vermilion (Fan Club, casas, Harbor/Pier), Route 4 casa, Route 5/6 casas (Day Care), portarias (gates) das rotas.
- Lixo local na raiz (não versionado): `.battle-*.png`, `.tmp_review_diff.txt`, `node`, `pnpm`, `FETCH_HEAD`, `tactimon@`, `local-assetsextractedpmd-eosvfx` (arquivo vazio com nome quebrado). `pnpm-lock.yaml` não versionado (decidir: versionar).
- `.gitignore` não cobre: `.next/`, `*.tsbuildinfo`, `.battle-*.png`, `.tmp_*`, `.venv-pmd/`, `local-assets/.tools/`, `apps/client/app/battle-preview/`, arquivos vazios da raiz.
- ~18.5k arquivos versionados em `local-assets/extracted/**` (incl. `lz77/` intermediário, ~8k arquivos). Avaliar se `lz77/` é consumido por runtime/scripts; se não, propor des-versionar (`git rm --cached`) — **pedir confirmação ao usuário antes**.
- `apps/client/AGENTS.md`/`apps/client/CLAUDE.md` não versionados — verificar conteúdo (provável gerado pelo Next) e decidir.

## Fases
### F1 — Limpeza (commit `chore:`)
1. Remover lixo da raiz e screenshots/tmp (não versionados) com `rm` explícito por arquivo — nunca `git clean` amplo.
2. Ampliar `.gitignore` com os padrões acima.
3. Decidir `pnpm-lock.yaml` (versionar se consistente com `pnpm install --frozen-lockfile`).
4. Código morto: exports não usados em `apps/client/lib`, `components`, `packages/game-data`; docs em `docs/` desatualizados vs `.claude/knowledge`.
5. `local-assets` versionado: medir uso (`rg lz77` em scripts/tools); propor des-versionamento ao usuário.

### F2 — Auditoria (sem código; resultado em `verification.md` → "Matriz de paridade")
Por mapa: warps/interiores, NPCs (posição/sprite/fala), placas, trainers (time/nível/prêmio/fala), itens visíveis + ocultos, eventos/cutscenes, key items, lojas (estoque por cidade), wild encounters (espécies/níveis/taxas), música.
Fontes: eventos/scripts extraídos em `local-assets/extracted/firered` (leitura direcionada por mapa, nunca varrer) + conhecimento FireRed. Agentes `gameplay-systems`/`repo-cartographer`, no máx. 2 em paralelo.
Status por linha: **faltando | divergente | ok | exceção (TM/held/instanciado)**.

### F3 — Correções (commits pequenos por área)
Ordem: (a) itens visíveis e ocultos por rota/cidade; (b) NPCs, placas e diálogos faltando; (c) eventos/key items faltando (ex.: fóssil Mt. Moon, Bill/S.S. Ticket, Fan Club/Bike Voucher, casa roubada Cerulean, Town Map, Oak's Parcel — conforme aplicável); (d) interiores faltando com warps; (e) divergências de trainers/encounters/marts.
Todo evento novo usa `playerWorldState`/`playerWorldGates` (por player) e normalização compatível com saves antigos.

## Acceptance criteria
- [ ] Raiz sem lixo; `.gitignore` cobre todos os padrões listados no CLAUDE.md.
- [ ] Matriz de paridade completa por mapa em `verification.md` (cada linha com status).
- [ ] Todos os itens visíveis do FireRed até Vermilion/SS Anne presentes (TM/held → listados em decisions).
- [ ] Itens ocultos implementados ou explicitamente adiados com motivo.
- [ ] NPCs/placas/diálogos/eventos marcados "faltando" corrigidos ou adiados com motivo.
- [ ] Nenhuma porta alcançável sem destino (interiores existentes).
- [ ] Saves antigos carregam sem erro (teste de normalização).
- [ ] Typechecks engine + client ✓; `pnpm test` ✓; testes novos para pickups/eventos/warps novos.
- [ ] Screenshots de mapas/eventos novos (1365×768 e ~1792×851).

## Arquivos prováveis
`.gitignore`, `apps/client/lib/{overworldPickups,maps,npcDialogues,overworldDialogues,scriptedWorldObjects,playerWorldGates,playerWorldState,story,storyPersistence,trainers,wildEncounters,mart,music}.ts`, `apps/client/components/OverworldGame.tsx`, `apps/client/scripts/*` (sync de mapas novos), `tests/*.test.ts`.

## Riscos
- Escopo enorme → commits por área; se exceder uma sessão, checkpoint em `progress.md` + handoff.
- Interiores novos exigem assets de mapa extraídos — verificar presença antes; não rodar extração ampla.
- Des-versionar `local-assets` afeta clones → só com confirmação.
- Mudanças em `StoryState` → normalização retrocompatível.
- Não varrer `tools/` nem `local-assets/` (só o arquivo do mapa alvo).

## Testes
Novos: pickups por mapa (coleta única por player), NPC/diálogo de eventos novos, gates de key items, warps de interiores novos, normalização de save antigo. `pnpm test` completo ao fim de cada fase.

## Ordem de commits
1. `chore: clean root clutter and extend gitignore`
2. `chore: track pnpm lockfile` (se aplicável)
3. `chore: remove dead code` (se houver)
4. `feat: add missing overworld items <região>` (um por região)
5. `feat: add missing npcs and dialogues <região>`
6. `feat: add <evento>` (um por evento)
7. `feat: add <interior> maps`
8. `fix: align <trainers|encounters|marts> with firered`
9. `chore: archive task 2026-10-04-002-kanto-parity-audit`
