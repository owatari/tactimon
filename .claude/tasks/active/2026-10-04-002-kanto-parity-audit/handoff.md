# Handoff — 2026-10-04-002-kanto-parity-audit (PARCIAL, task segue `running`)

Feito (commits d25efa12, ede6ad0b, 33f5ad44, e853f978):
- Limpeza de raiz + .gitignore + lockfile.
- Itens/ocultos FireRed até Vermilion (`lib/items.ts`, `overworldPickups.ts`), por player em `bagItems`.
- world.json habilitado em todos os mapas; NPCs curados e placas interativas pt-BR (`lib/worldTexts.ts`); NPCs inventados de Mart/PC removidos.

Pendente (ver matriz em verification.md): interiores, trainers (SS Anne etc.), eventos, itens usáveis/marts, validação visual (1365×768 e ~1792×851).
Decisão do usuário: des-versionar `local-assets/extracted/*/lz77/` (~8k arquivos, não usados em runtime).
Testar: `pnpm dev`, andar por Pewter/Cerulean/Vermilion/Mart/PC e ler placas e itens ocultos (frente ao tile).
