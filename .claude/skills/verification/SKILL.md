---
name: verification
description: Checklist antes de commit/fechamento de task — typechecks, testes direcionados e completos, diff review, checagem visual, Git final.
---
# Verification

Iteração: testes direcionados. Milestones e final: suíte completa.

```
pnpm --filter @tactimon/battle-engine typecheck
pnpm --filter @tactimon/client typecheck
pnpm test                       # sem FAIL
git diff --check
git diff --stat
```
- Falha "pré-existente"? Prove rodando no `base_head` (`git worktree add <tmp> <sha>`) ou pelo registro da task. Sem prova = regressão.
- Diff: sem `console.log` temporário, sem TODO evitável, sem arquivo gerado, sem teste enfraquecido.
- UI: screenshots 1365×768 e ~1792×851 inspecionados (skill `pokemon-ui`).
- Registre em `verification.md`: comando → resultado.
- Git final: mudanças da task commitadas; `HEAD == origin/main` após push.
