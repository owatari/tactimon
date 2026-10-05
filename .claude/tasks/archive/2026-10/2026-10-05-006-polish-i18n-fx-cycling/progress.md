# Progress

## checkpoint 1
- [x] Bug evolução: GameClient fixava species antiga (loop) + normalizeCapturedPokemon descartava espécies fora das 21 originais (perdia Eevee/Pidgeotto no load) — story.ts, partyProgress.ts
- [x] Reset de save: Options → ERASE SAVE (2x Enter) e `/?reset=1` — saveReset.ts
Próximo: raids (lendários), HMs por party + Rock Smash, Cycling Road, dano flutuante/FX, i18n, UI FireRed
## checkpoint 2
- [x] i18n core (lib/i18n: t/tx/useLocale, catalog por domínio, detecção navegador, opção LANGUAGE, tradução na exibição via runDialogueInteraction, teste de cobertura de chaves) — ff8cbfbb
- [x] Raids: lendários só avisam (16d3c961); HMs/Rock Smash pela party (tabela ROM gTMHMLearnsets) — 3646bf1a; Cycling Road — 76f11d3e
- [x] Combate: números flutuantes (dano/cura/miss/efetividade/status/stat), FX por tipo (CSS), projétil — validado por screenshots
Próximo: migrar textos existentes para t()/catálogos (UI, diálogos, quests, itens, trainers, NPCs, placas, nomes de espécies/golpes, logs da engine), UI FireRed
