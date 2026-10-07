# Decisions — 2026-10-06-035-menus-mouse-and-input-layer
- Abordagem: em vez de migrar cada menu para um hook, uma ponte traduz mouse/gamepad nas teclas que os menus ja tratam (o Start Menu ja usava KeyboardEvent sintetico). Menus de botoes (batalha etc.) ganham navegacao por foco espacial.
- Botao direito lido em pointerdown (mousedown nao dispara porque a pagina cancela pointerdown).
- Fix colateral: volume de audio negativo (-7e-11) no fade de musica causava IndexSizeError intermitente no E3; agora clamp.
