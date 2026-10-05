# Verificação

- Typecheck engine + client ✓; `pnpm test` (raiz 77 arquivos/≈400 testes + engine 8/211) ✓; `python tools/i18n/audit.py` → 0 faltando.
- Testes novos: evolution-persistence, save-reset, hm-party, cycling-road, i18n (catálogo, cobertura t(), pt literais), i18n-names; ajustes em testes que liam texto pt.
- Validação visual (Edge headless + playwright-core, 1365×768 e 1792×851): casca FireRed (sem cabeçalho), menus limitados, números flutuantes, FX por tipo (demo 17 tipos), idioma automático (fr/zh/pt/es pelo navegador; zh renderiza CJK), batalha 100% em inglês com log localizado.
- Subagentes: 4 de tradução (NPCs/placas, treinadores, diálogos/quests, UI/itens) + 1 engine (log estruturado) + verifier.
