# Decisions

- Origem: lacuna da task 009-completeness-audit; sem exclusividade de versão (decisão do usuário).
- Pokédex: dados da ROM (categoria/altura/peso/descrição em inglês) via gerador; descrições NÃO traduzidas (só en) — pendência de i18n. Unidades imperiais como no FR (HT 2'04", WT 15.2 lbs.).
- Sem assets de UI extraídos da ROM (só ícones de itens): moldura/paleta recriadas em CSS (`.dex-*`, vermelho #d84838 + creme). Extrair tilesets/molduras da ROM fica para a task 016.
- CRY/SIZE/SEARCH do FR não implementados (sem áudio/dados); só AREA e BACK.
