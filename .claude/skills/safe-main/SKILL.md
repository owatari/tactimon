---
name: safe-main
description: Preflight Git, preservação do working tree, commit seletivo e push sem force direto em main. Use antes de qualquer alteração e em todo commit/push.
---
# Safe main

## Preflight
```
git fetch origin main --prune
git branch --show-current          # deve ser main
git rev-parse HEAD origin/main
git status --short --branch
git log --oneline --decorate -8
```
- HEAD atrás de origin/main e sem conflito → `git pull --rebase --autostash origin main` (após entender as mudanças locais).
- Divergência inesperada → pare e investigue (`git log HEAD..origin/main`, `git log origin/main..HEAD`).

## Sujeira local conhecida (nunca stagear)
`apps/client/next-env.d.ts`, `local-assets/**/world-asset-manifest.json`, `local-assets/.tools/`, `local-assets/extracted/*/assets/maps/world/`, `local-assets/extracted/firered/music/`, `local-assets/extracted/pmd-eos/vfx/{effect.bin,entries/}`, `.next/`, `*.tsbuildinfo`, `.battle-*.png`, `.tmp_*`, `.venv-pmd/`, `apps/client/app/battle-preview/` (debug local), arquivos vazios na raiz (`node`, `pnpm`, `FETCH_HEAD`, `tactimon@`, `local-assetsextractedpmd-eosvfx`), `pnpm-lock.yaml` (untracked; só versionar em task própria).

## Commit
1. `git diff --stat` → `git diff -- <arquivo>` para revisar.
2. `git add <arquivos explícitos>` (nunca `git add .`/`-A`). Arquivo com mudanças de assuntos diferentes: separe hunks (`git apply --cached <patch>`), não comite pedaços de outra mudança.
3. `git diff --cached --check` e `git diff --cached --stat`.
4. Mensagem semântica (`feat:`, `fix:`, `chore:`, `test:`, `docs:`) + linha de co-autoria exigida pelo ambiente.

## Push
`git fetch origin main` → se avançou: `git pull --rebase origin main` + testes afetados → `git push origin main` (nunca force) → confirmar `git rev-parse HEAD origin/main` iguais.

Proibido: branch nova, `reset --hard`, `clean -fdx`, `push --force`, `checkout -- .`, `restore .`.
