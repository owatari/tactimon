# Tactimon Online — contexto mínimo para Claude Code

Pokémon online tático: mundo/UI no estilo **Pokémon FireRed** (Kanto), combate em **grid tático** (party inteira, AP/MP/PP, wild packs até ~10), portraits/VFX de **PMD Explorers of Sky**. Idioma de trabalho/docs: **português**. Código, símbolos e commits: inglês, padrão existente (`feat:`, `fix:`, `chore:`).

## Monorepo (pnpm)
- `apps/client` — Next.js (React 19). UI, overworld, story/saves (`lib/`), batalha (`components/FirstBattle.tsx`).
- `packages/battle-engine` — engine determinística (`src/duel.ts`, `progression.ts`, `capture.ts`).
- `tests/` — vitest de nível raiz (lib do client). `packages/battle-engine/test/` — vitest da engine.
- `tools/`, `local-assets/` — extração de ROM/sprites. **Não ler/varrer** (enorme, binário, gerado).

## Comandos
```
pnpm --filter @tactimon/battle-engine typecheck
pnpm --filter @tactimon/client typecheck
pnpm test                                  # vitest tests/ + engine
pnpm exec vitest run tests/<arquivo>       # iteração direcionada (raiz)
pnpm --filter @tactimon/battle-engine exec vitest run test/<arquivo>
pnpm dev                                   # client em http://localhost:3000 (/battle-preview se existir localmente)
```

## Git — regras absolutas
- Trabalhar **direto em `main`**. Nunca criar branch, `reset --hard`, `clean` amplo, `push --force`.
- Preflight antes de alterar: `git fetch origin main --prune`, HEAD vs origin/main, `git status --short --branch`.
- Staging **por arquivo explícito** (nunca `git add .`). `git diff --check` + revisão do diff antes do commit.
- **Não versionar** sujeira local: `apps/client/next-env.d.ts`, `local-assets/**/world-asset-manifest.json`, `.next/`, `*.tsbuildinfo`, `.battle-*.png`, `.tmp_*`, `.venv-pmd/`, `apps/client/app/battle-preview/` (debug local), arquivos vazios na raiz (`node`, `pnpm`, `FETCH_HEAD`, `tactimon@`).
- Detalhes: skill `safe-main`.

## Princípios de produto (resumo — detalhes em `.claude/knowledge/`)
- UI deve parecer Pokémon real (FireRed): pixel art, `image-rendering: pixelated`, sem gradients/glassmorphism/cards SaaS, sem esticar sprites.
- Nomes em batalha: aliado local preto, outro player azul, inimigo vermelho. Sem círculos de allegiance.
- TMs e Held Items só em raids/dungeons. Lendários/míticos são raids futuras do MMO: interagir só avisa (nunca inicia batalha).
- **Todo texto de jogo é inglês + i18n** (en/pt/es/fr/zh, troca automática pelo idioma do navegador/opção LANGUAGE): escreva `t("English {x}", {x})` (ou `tx("…")` em dados estáticos) e registre a tradução nos 4 idiomas em `apps/client/lib/i18n/catalog/` — `tests/i18n.test.ts` falha se faltar. Nomes de espécie/golpe: `lib/i18n/names*.ts`. Detalhes: `tools/i18n/README.md`.
- Saves são locais (localStorage) e precisam de normalização compatível com saves antigos.

## Como trabalhar
- Pedidos relevantes viram task: **`/new-task <descrição>`** (planeja) → **`/run-task <id>`** (executa, verifica, commita, arquiva). Ledger em `.claude/tasks/`.
- Conhecimento estável: `.claude/knowledge/INDEX.md` → ler **só** o arquivo do assunto.
- Leitura seletiva: `rg` para localizar símbolo → ler apenas o range. Nunca abrir JSON/manifests/imagens/assets extraídos sem necessidade. `git diff --stat` antes de diff completo.
- Agentes (`.claude/agents/`) só quando reduzem contexto; no máximo 2 em paralelo.

## Definition of Done global
Typechecks (engine + client) ✓ · `pnpm test` ✓ sem falhas novas · UI alterada validada com screenshot (1365×768 e ~1792×851) · diff revisado · commits pequenos e semânticos · push normal em `main` · task arquivada e `INDEX.md` atualizado.
