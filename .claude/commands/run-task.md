---
description: Executa uma task do ledger ponta a ponta (preflight → implementação → verificação → commit → push → arquivo)
argument-hint: [task-id]
---

Task: $ARGUMENTS

Se vazio: use a única task `planned`/`running` em `.claude/tasks/active/`; se houver mais de uma, pergunte o ID e pare.

Skills obrigatórias: `safe-main`, `task-ledger`, `verification` + as listadas em `state.json.skills`. Leia apenas a knowledge relevante (via `INDEX.md`).

## 1. Preflight (skill `safe-main`)
- fetch, branch == main, HEAD, origin/main, `git status --short --branch`.
- Leia `state.json`, `progress.md`, `handoff.md` da task. **Retome do último checkpoint** — não refaça o que já está registrado como feito.
- Se HEAD ≠ `state.current_head`/`base_head`: investigue `git log` dos novos commits e integre.
- Trabalho local não commitado: classifique (da task / sujeira local / de outra pessoa) antes de tocar. Nunca descarte.
- `state.status = "running"`.

## 2. Execução
- Siga `plan.md`. Reutilize sistemas existentes; escreva testes junto com a implementação.
- Checkpoint em `progress.md` (fatos curtos: feito / arquivos / próximos passos) após cada subitem relevante e antes de cada commit.
- Decisões não óbvias → `decisions.md` (1–3 linhas cada).
- Agentes: só quando economizam contexto; máx. 2 em paralelo; registre os achados no ledger.

## 3. Verificação (skill `verification`)
- Testes direcionados durante a iteração; typechecks; `pnpm test` completo no fim.
- UI: screenshot em 1365×768 e ~1792×851 (skill `pokemon-ui`).
- `git diff --check` e revisão do diff. Agente `verifier` quando o diff for grande/arriscado.
- Registre comandos e resultados em `verification.md`.

## 4. Commit e publish
- Commits pequenos, staging explícito, mensagens semânticas, cada commit testável.
- Antes do push: fetch; se origin/main avançou, rebase local simples (`git pull --rebase origin main`) sem force; push normal; confirme `origin/main == HEAD`.
- Registre SHAs em `state.json.commits`.

## 5. Fechamento
- `state.status = "done"`, `handoff.md` curto (o que mudou, como testar, pendências).
- Mova a pasta para `.claude/tasks/archive/YYYY-MM/`, atualize `INDEX.md`, commit `chore: archive task <id>` e push.
- Conhecimento estável descoberto → atualize o arquivo correspondente em `.claude/knowledge/`.

Resposta final curta: task, commits (SHA + msg), verificação, como testar localmente, pendências.
