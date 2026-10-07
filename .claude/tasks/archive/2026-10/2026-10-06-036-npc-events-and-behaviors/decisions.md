# Decisions — 2026-10-06-036-npc-events-and-behaviors
- Estado real: treinadores ja viam em linha reta mas desafiavam na hora, sprites de NPC sempre no frame 0 (sul) e sem movimento; rivais eram so gatilho de tile sem sprite.
- Objetos de ROM em worldObjectsRef sao copias que andam (homeX/homeY guardam o tile da ROM para textos); render React usa os originais e o DOM e atualizado por frame.
- Tipos de movimento sem implementacao (walk sequences, copy-player...) ficam parados e listados em UNIMPLEMENTED_MOVEMENT_TYPES; mapeamento de ids e de memoria do pokefirered e pode precisar de ajuste fino.
- Falas finais dos rivais sao textos novos em ingles + i18n (os desafios continuam em PT legado).
