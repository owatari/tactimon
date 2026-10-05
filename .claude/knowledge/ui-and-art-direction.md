# UI e direção de arte

- Referência: FireRed. Caixas com borda sólida escura + inset claro, fundo creme (`#fffceb`/`#f8f8f8`), texto escuro, fonte pixel. Sem gradients modernos, glassmorphism, blur, cards SaaS, sombras difusas.
- CSS global único: `apps/client/app/globals.css` (~5.8k linhas) — localizar por classe com `rg`. Prefixos: `.battle-*`, `.pokemon-battle-sprite*`, `.overworld-*`, `.hud*`, `.progression-*`, `.blackout-*`.
- Batalha: arena em grid, HUDs de time nos flancos, turn order com portraits PMD (`PokemonPortrait.tsx`). Nomes: aliado local preto, outro player azul, inimigo vermelho. Status múltiplos devem caber.
- Sprites: `PokemonBattleSprite.tsx` + `lib/spriteLayout.ts` — escala pelo corpo visível do idle (`bounds` do manifest; ≥ 1 tile, grandes crescem sub-linearmente: Onix ~2,2), mesma escala em todas as animações, frame ancorado pelo ponto de chão PMD (`groundX/groundY` = centro do frame + ~4 px) em `SPRITE_GROUND_Y` do tile. Nada de tabela de escala por espécie no CSS.
- Viewport de batalha coerente com overworld; tudo deve caber em 1365×768 e ~1792×851.
- Validação: skill `pokemon-ui` (`screenshot.mjs` via Edge headless/CDP). Rota de debug local `/battle-preview` existe só no working tree local (não versionada).
