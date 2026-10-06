# decisions — 2026-10-06-033-gym-teams-onix-footprint-hud-card
- "Nidokin" do pedido = Nidoking (o time original ja tinha Nidoking). Ordem e especies exatas do pedido; niveis dentro da faixa original; golpes originais quando a especie ja existia.
- Misty: o pedido listava Starmie em 2o; coloquei Starmie por ultimo (ás) para manter o prêmio canônico (4 x nível do último = 2100) e a ordem crescente. Demais líderes seguem a ordem pedida.
- Onix: sprite idle 92x53 px (≈1,7:1), spriteTileSpan ≈ 2,25 tiles; a engine usa 1 tile por unidade. Decisão: manter 1 tile lógico (footprint multi-tile mexe em spawn/colisão/IA/posições únicas = alto risco); o sprite já é desenhado ~2 tiles de largura ancorado no tile de origem (screenshot). Footprint real fica como task futura.
- Cards: altura fixa de 54px cortava o conteúdo (70px); agora altura automática, mínimo 70px, retrato/corpo centralizados.
