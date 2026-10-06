# Plan — 019 wild pack balance
Por membro da party, vs. teto (`range.max`) dos níveis selvagens da área: abaixo do teto → 0–1; no teto até +9 → 1; +10 → 1–2; +20 → 2–3. Soma por membro, mínimo 1 (pack nunca vazio), teto `MAX_WILD_PACK_SIZE` (10); água continua limitada a 4.
Arquivos: `apps/client/lib/wildEncounters.ts` (`wildCountForPartyLevel`), `tests/route2.test.ts`.
