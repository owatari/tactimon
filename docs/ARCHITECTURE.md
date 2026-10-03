# Architecture v0.1

## Principles

1. Server-authoritative combat.
2. Deterministic battle core independent of renderer/networking.
3. Data-driven moves, encounters, species, rewards and tuning.
4. Shared protocol/types between client and server.
5. Production does not depend on shipping reference ROMs.

## Workspace

```text
apps/client
apps/server
packages/battle-engine
packages/game-data
packages/protocol
packages/shared
tools/rom-data
tools/sprite-importer
```

World server handles persistent presence, movement, interactions, encounter rolls, social/group state and dungeon entry. Instance state handles authored dungeon puzzles/static encounters. Battle engine consumes authoritative state + command and emits validated events/new state.

The client sends intent such as “use move X on tile Y”; it never declares damage or capture success.

## First vertical slice

Deterministic 6v6 battle, Speed initiative, 4-dir movement, four moves, Pokémon stat hooks, damage/type/STAB/crit hooks, status hooks, one-attempt capture/flee, encounter capture policy and Held/Berry equipment state.
