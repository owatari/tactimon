# Handoff — 024
Sprites de batalha limitados ao próprio tile (largura ≤1, altura ≤1,4) + sombra no chão. Espécies grandes (Onix, Gyarados) ficam menores por design. Pendência: se quiserem grandes de novo, ocupar 2 tiles no engine (tamanho de unidade); rótulos ainda alternam acima/abaixo.

## Correção (2026-10-06)
Diagnóstico desta task estava errado: sprites grandes devem poder passar de 1 tile e o limite de escala foi revertido. A causa real do desvio era geométrica (ver task 028).
