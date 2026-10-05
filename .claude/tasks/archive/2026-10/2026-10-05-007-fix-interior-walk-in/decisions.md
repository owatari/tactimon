# Decisions

- Causa raiz: `storyHasHealthyPokemon` (guard em OverworldGame: transição de borda e fim de passo com `pendingWarp`) tratava "sem Pokémon" como "todos desmaiados"; save novo (sem inicial) ficava parado em cima da porta do Oak Lab. Introduzido junto do fix de poison de campo (3e8ee9bf/c713e16b).
- Fix: `storyIsKnockedOut` (story.ts) = tem Pokémon e nenhum saudável; só isso bloqueia transições.
