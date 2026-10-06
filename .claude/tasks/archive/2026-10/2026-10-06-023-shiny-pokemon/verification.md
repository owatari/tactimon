# Verification — 023
- Engine `personality.test.ts` (shiny: odds, wild/captura/progressão) → 234/234. Client: `follower.test.ts` (lead shiny), `personality-client.test.tsx` (normalização/save/pending, URL do front sprite). `pnpm test`: 92 arquivos/500 testes + engine 234. Typecheck 0 erros.
- `pnpm e2e:walkthrough` 10/10 (novo E10: banner SHINY! + front sprite shiny).
- Assets: 151/151 espécies com `shinyFile` no manifest; 440 PNGs de front shiny sincronizados. Screenshots: tela de captura (1365×768, ★ + SHINY!), follower Charmander shiny (1792×851), Summary.
- Não verifiquei um shiny real em batalha (1/8192); o sprite é o mesmo componente do follower, com `unit.shiny`.
