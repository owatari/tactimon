# Verification — 025
- Engine: `ev-system.test.ts` (yields da ROM, sem EV por nível, captura sem EV, participantes recebem yield completo, caps 252/510, vitaminas até 100, saves antigos) + `progression.test.ts` atualizado → 230/230.
- Client: `tests/vitamins.test.ts` (uso no Bag, consumo, recusa em 100, membro não líder, estoque Celadon) e i18n (descrições/mensagens em 5 idiomas).
- Typecheck engine/client 0 erros; `pnpm test`: 90 arquivos/484 testes + engine 230.
- Playthrough e2e não rerodado: usa progressões sem EV nem personalidade; a ordem EV→level-up não muda níveis.
