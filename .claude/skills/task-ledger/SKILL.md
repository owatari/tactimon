---
name: task-ledger
description: Criar, atualizar (checkpoints), retomar, fazer handoff e arquivar tasks em .claude/tasks. Use em /new-task, /run-task e ao retomar trabalho interrompido.
---
# Task ledger

Estrutura e templates: `.claude/tasks/README.md`. Índice: `.claude/tasks/INDEX.md`.

## Criar task
1. ID `YYYY-MM-DD-NNN-slug`; pasta `.claude/tasks/active/<id>/`.
2. `request.md` = pedido literal. `plan.md` = objetivo, acceptance criteria (checklist verificável), arquivos prováveis, riscos, testes, ordem de commits.
3. `state.json` com `status: "planned"`, `base_head`, skills, agents. Linha nova no INDEX.

## Checkpoint (durante /run-task)
- `progress.md`: append em bullets curtos — `[x] item — arquivos — resultado` e `Próximo:`. É a memória externa: uma nova sessão deve conseguir continuar lendo só ele + `state.json`.
- `state.json`: atualize `current_head`, `files`, `commits`, `tests`, `status`.
- Nunca registrar raciocínio interno; só fatos, decisões, comandos, resultados, riscos, pendências.

## Retomar
Leia `state.json` → `progress.md` (último "Próximo:") → `handoff.md`. Confira `git log <base_head>..HEAD` e `git status`. Não reabra arquivos já resumidos sem motivo.

## Fechar
`verification.md` completo → `handoff.md` (≤ 20 linhas) → `status: "done"` → `git mv .claude/tasks/active/<id> .claude/tasks/archive/YYYY-MM/<id>` → atualizar INDEX → commit `chore: archive task <id>`.
