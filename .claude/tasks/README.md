# Tasks — ledger versionado

```
.claude/tasks/
  INDEX.md                 # uma linha por task
  active/<id>/             # tasks planned/running/blocked
  archive/YYYY-MM/<id>/    # tasks done
```
ID: `YYYY-MM-DD-NNN-slug` (NNN sequencial no dia).

## Arquivos da task
| Arquivo | Conteúdo |
| --- | --- |
| `request.md` | pedido literal do usuário |
| `plan.md` | objetivo, acceptance criteria (checklist), arquivos prováveis, riscos, testes, ordem de commits |
| `state.json` | estado machine-friendly (abaixo) |
| `progress.md` | checkpoints curtos — memória externa para retomar |
| `decisions.md` | decisões não óbvias (1–3 linhas cada) |
| `verification.md` | comandos executados → resultados; screenshots feitas (paths temporários) |
| `handoff.md` | resumo final ≤ 20 linhas: o que mudou, como testar, pendências |

Screenshots e artefatos grandes ficam fora do Git (scratchpad/temp). Nunca registrar raciocínio interno — só fatos, decisões, comandos, resultados, riscos, pendências.

## state.json
```json
{
  "id": "2026-10-04-001-slug",
  "title": "...",
  "status": "planned",
  "created_at": "2026-10-04",
  "base_head": "<sha>",
  "current_head": "<sha>",
  "skills": [],
  "agents": [],
  "files": [],
  "commits": [],
  "tests": []
}
```
`status`: `planned | running | blocked | done`.

## progress.md (formato)
```
## <data/hora> — checkpoint
- [x] item — arquivos — resultado
- [ ] item pendente
Próximo: <ação concreta>
```
