# Decisões

- i18n: inglês é a fonte (`t("English {x}")`); texto pt legado mantém o literal pt como chave (entrada com `en`) para não reescrever ~1000 strings; teste falha se surgir pt novo sem catálogo.
- Tradução acontece na exibição (`runDialogueInteraction` → `localizePresentation`), nunca em nível de módulo; dados estáticos usam `tx()`.
- Nomes: pt/es usam os nomes ingleses de Kanto (oficiais); fr/zh têm tabela; log da engine é estruturado (template+params) e os nomes são trocados no cliente.
- HMs: HM do NPC + insígnia continuam; adicionou-se exigência de Pokémon compatível na party (ROM). Rock Smash só exige Pokémon compatível (HM06 é Sevii).
- Cycling Road: gate por tile nas gatehouses (sem descida forçada).
- Reset de save: ação manual (ERASE SAVE com confirmação) e `/?reset=1`; não apago o localStorage do usuário automaticamente.
- Bug de evolução: causa raiz = `species: existing.species` em applyPartyProgressionRewards; bug irmão: normalizeCapturedPokemon descartava espécies fora das 21 originais.
