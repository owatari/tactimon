# Direção de produto

Fonte longa: `docs/GAME_DESIGN.md`, `docs/BATTLE_SYSTEM.md`, `docs/CAPTURE_SYSTEM.md`.

- Pokémon online tático. Mundo, story e UI seguem **Pokémon FireRed** (Kanto, scripts e eventos canônicos adaptados). Portraits/VFX de **PMD Explorers of Sky**; animações de batalha de **SpriteCollab** (PMD).
- Combate: grid tático; party inteira participa; wild packs escalam com tamanho/força do time (até ~10); iniciativa por Speed; AP/MP/PP; tipos; status; buffs/debuffs; moves de área/linha/cone; AI tática; Auto Battle, Auto Catch, velocidade 2x; captura; evolução.
- Economia: **TMs e Held Items só em raids/dungeons** — não introduzir no overworld comum sem task explícita.
- Persistência local (localStorage) de story e posição; progressão nunca pode ser perdida por reload; saves antigos devem ser normalizados.
- Textos de jogo em português.
- Primeira batalha (Blue no Oak's Lab) é tutorial: perder não leva ao Pokémon Center.
- Running Shoes: desbloqueio FireRed-like ao entrar na Route 3 após a Boulder Badge; R alterna WALK/RUN.
