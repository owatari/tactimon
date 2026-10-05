---
description: Registra e planeja uma nova task no ledger (não implementa)
argument-hint: <descrição livre do pedido>
---

Pedido original (registrar LITERALMENTE em `request.md`):

$ARGUMENTS

Siga a skill `task-ledger` (seção "Criar task"). Resumo obrigatório:

1. **Não implemente nada.** Só investigação mínima + plano.
2. Git rápido: `git fetch origin main --prune`, `git rev-parse HEAD origin/main`, `git status --short --branch`. Registre `base_head`.
3. ID = `YYYY-MM-DD-NNN-slug` (NNN = próximo sequencial do dia em `.claude/tasks/INDEX.md`; slug curto em kebab-case). Pasta: `.claude/tasks/active/<id>/`.
4. Pesquise SÓ o necessário: `.claude/knowledge/INDEX.md` → arquivo do assunto → `rg` por símbolos → ranges específicos. Use o agente `repo-cartographer` apenas se a área for desconhecida e ampla.
5. Crie a partir de `.claude/tasks/README.md`: `request.md`, `plan.md` (objetivo, acceptance criteria verificáveis, arquivos prováveis, riscos, testes necessários, ordem de commits), `state.json` (`status: "planned"`, skills e agentes selecionados), `progress.md` (vazio com cabeçalho), `decisions.md`, `verification.md`, `handoff.md`.
6. Adicione linha em `.claude/tasks/INDEX.md`.
7. Responda APENAS:

```
Task criada: <id>
Objetivo: <1 linha>
Pronta para /run-task <id>
```
