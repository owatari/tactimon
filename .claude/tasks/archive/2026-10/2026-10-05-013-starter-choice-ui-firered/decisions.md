# Decisions

- Origem: lacuna da task 009-completeness-audit; sem exclusividade de versão (decisão do usuário).
- Lógica de input pura em lib/starterChoice.ts (testável); componente só renderiza. Poké Ball em SVG pixel-a-pixel (sem assets novos). Classe `.fr-window` criada como janela FireRed reutilizável (útil para a task 014).
- Removido o CSS .starter-card/.grid/.orb/.type (SaaS). Texto "Blue escolherá..." removido da tela (continua a regra no jogo).
- Revisão (pedido do usuário): sem SVG/mesa desenhada. OverworldGame ganhou `starterFocus` (zoom inteiro cobrindo o viewport, foco na mesa x=9,y=4) e `onStarterPointer`; as balls reais do lab ganham bob/▼ (selecionada) e dim (outras); botões invisíveis sobre as balls fazem hover → portrait/descrição e click → prompt YES/NO.

- Decisão do usuário: ordem da mesa = Bulbasaur, Charmander, Squirtle (x 8/9/10), mesmo divergindo da ROM (Bulbasaur, Squirtle, Charmander; verificado nos scripts das balls). Feixe cônico + sprite frontal FireRed (firered/pokemon/front/normal) sobre a ball em foco (hover/teclado).
