# Progress — 2026-10-09-001-party-exp-split-and-autoplay
- [x] Fase 1: popup SUMMARY/SWITCH/CANCEL removido (StartMenu: Enter fixa Summary, Shift+↑↓ reordena; tela "summary" antiga removida), e2e pokemon atualizado — commit 'feat: party window without popup actions'
- [x] Fase 2: EXP share — engine `splitExperience`/`MIN_EXP_SHARE_PERCENT` + param `shares` em grantWildBattlesProgressToParty/grantTrainerBattleProgressToParty; client lib/expShare.ts (fit/set/channel/sharesForSlots/swap), `StoryState.expShare` (normalizado; segue o Pokémon no reorder), GameClient aplica, ExpShareSlider no rodapé da janela Pokémon; tests/exp-share.test.ts (11), e2e pokemon (sliders) ok
- Próximo: Fase 3 controlador de velocidade/mudo, Fase 4 bot (planner), Fase 5 janela AUTO
