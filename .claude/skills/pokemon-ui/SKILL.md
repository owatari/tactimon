---
name: pokemon-ui
description: Linguagem visual FireRed, tamanho/offset de sprites, portraits PMD, responsividade e validação por screenshot. Use ao alterar UI de batalha, overworld, HUD ou pós-batalha.
---
# Pokémon UI

Knowledge: `.claude/knowledge/ui-and-art-direction.md`.

Checklist:
- Caixas FireRed (borda sólida + inset), fonte pixel; sem gradients modernos, blur, glass, sombras SaaS, cantos grandes.
- Sprites: `image-rendering: pixelated`, escala derivada da metadata (`PokemonBattleSprite.tsx`), nunca esticar, base no pé do tile, tamanho estável entre animações.
- Nomes: aliado local preto, outro player azul, inimigo vermelho. Status múltiplos não estouram card.
- Tudo cabe em 1365×768 e 1792×851; nenhum botão fora da área visível.

Screenshot (com `pnpm dev` rodando):
```
node .claude/skills/pokemon-ui/screenshot.mjs <url> <saida.png> [largura] [altura]
```
Salve no scratchpad (não commitar). Inspecione o PNG (Read) e corrija overflow/clipping antes de concluir.
Estado reproduzível: rota local `/battle-preview` (não versionada) ou save injetado em `localStorage` (`tactimon.story.v1`).
