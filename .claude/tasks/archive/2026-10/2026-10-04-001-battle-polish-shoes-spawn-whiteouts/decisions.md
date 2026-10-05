# Decisões
- Água surf-only = behaviors 0x10–0x15 (pond..ocean). 0x16 puddle e 0x17 shallow water são andáveis no FireRed → não bloqueiam spawn.
- Running Shoes entregues pelo ajudante do Prof. Oak (canônico FRLG), não "ajudante da mãe" do WIP.
- Tutorial do Blue cura a party também na vitória (script do lab FRLG chama HealPlayerParty); derrota não perde dinheiro.
- Respawn: proteção dupla (ref no OverworldGame + limpeza no GameClient) porque refs resetam em remount e callbacks inline mudam de identidade.
