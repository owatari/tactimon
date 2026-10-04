# Player-scoped world state

Tactimon uses a shared immutable map plus a private progression projection for each player.

## Invariant

Progression never mutates the shared world.

Every stateful world change belongs to the player who caused it. Examples:

- collecting an overworld item;
- defeating a trainer or rival;
- earning a badge;
- choosing a fossil;
- obtaining a key item;
- learning a field technique such as Cut;
- clearing a Cut obstacle;
- completing a scripted story step.

The owning player's `StoryState.playerWorld` stores these changes as namespaced event IDs and choices. Object visibility and progression gates are derived from that player's state.

A Cut tree therefore remains visible and blocking for player B after player A cuts it. A fossil or item collected by player A remains available for player B. Trainer defeat and badge gates behave the same way.

## Shared vs. private state

Shared world data may contain only immutable/common data such as:

- map layouts and collision data;
- NPC/trainer definitions;
- encounter tables;
- static dialogue definitions;
- positions and visual definitions that are the same for everyone.

Player-private progression contains:

- `pickup:<id>`;
- `trainer:<id>`;
- `badge:<id>`;
- `obstacle:<id>`;
- `key-item:<id>`;
- `field-technique:<id>`;
- story choices such as the Mt. Moon fossil and Bill stage.

Legacy arrays in `StoryState` are currently mirrored for save compatibility. New gameplay code should use the helpers in `story.ts` rather than reading those arrays directly.

## Future multiplayer rule

When a realtime/server layer is introduced, `playerWorld` is owned by a player/account and must never be broadcast as a room/world mutation.

The server may replicate another player's avatar/action animation, but completion of a progression event is addressed only to that player's persistent progression snapshot. Other players continue to project the same shared map through their own `playerWorld`.

## Dialogue integration

Dialogue scripts are resolved through `dialogueSystem.ts`. Stateful dialogue interactions return a new private `StoryState`, so dialogue rewards and story steps obey the same ownership rule automatically.


## Runtime projection APIs

Map definitions remain immutable. Runtime visibility must be projected with
player-owned state:

- use `resolvePlayerOverworldPickups(mapId, story)` for pickup visibility;
- use `resolvePlayerOverworldTrainers(mapId, layout, objects, story)` for
  trainer defeat state;
- combine geometry-only trigger helpers with `isStoryTrainerDefeated`,
  `hasStoryKeyItem`, `hasStoryBadge`, and other story helpers.

Legacy APIs that accept arrays are compatibility surfaces only and should not
be used by new gameplay code.

All player-facing overworld text, including transient gate/trainer messages,
must enter through `DialogueInteractionRequest` / `DialoguePresentation`.
This keeps rendering, multi-page support, stateful actions, and future
localization in one dialogue pipeline.


## Generic dialogue progression

Dialogue pages may expose choices. A choice points to another
`DialogueInteractionRequest`, so branching dialogue does not require new
interaction code in the overworld.

For future story switches and branches, prefer the generic player-owned
operations:

- `complete-event` marks a namespaced event only for that player;
- `set-choice` persists a branch/value only for that player.

The corresponding story helpers are `completeStoryPlayerEvent`,
`getStoryPlayerChoice`, and `setStoryPlayerChoice`.

These APIs are the extension point for future doors, switches, quest stages,
NPC branches, instanced objects, and similar progression. Shared map
definitions must stay immutable.


## Declarative object visibility

Player-instanced objects use serializable `PlayerWorldCondition` rules from
`playerWorldProjection.ts`. Rules can depend on namespaced events, choices,
and `all` / `any` / `not` composition.

The overworld projects shared object definitions through
`projectPlayerWorldDefinitions(definitions, story)`. This is now used by
Mt. Moon fossils, Bill's forms, and the Vermilion Cut tree.

Future progression objects should declare `visibleWhen` instead of adding
map-specific visibility branches. Because these rules are data-shaped rather
than callbacks, the same rules can later be evaluated authoritatively on a
server for multiplayer.


## Registry-driven stateful dialogue

Existing stateful interactions (Bill, Bill's computer, Pokémon Center healing,
Cut, fossils, pickups and the S.S. Anne Captain) are registered dialogue
scripts. Runtime objects invoke them with `kind: "script"` plus an optional
context object.

New dialogue-backed progression must add a registry entry instead of adding a
new branch to the overworld or central interaction dispatcher. The handler
receives only the owning player's `StoryState` and returns that player's next
state plus a `DialoguePresentation`.

Legacy bespoke interaction kinds remain compatibility surfaces only. New
gameplay code should use registered scripts.


## Declarative scripted world objects

Dialogue-backed progression objects are registered in
`scriptedWorldObjects.ts`. Each definition contains immutable visual/position
data, an optional serializable `visibleWhen` rule, and a
`DialogueInteractionRequest`.

Fossils, Bill's forms, the S.S. Anne Captain, Cut trees, Pokémon Center nurses
and overworld pickups use this registry. `OverworldGame` no longer needs a
new object kind or interaction branch for those systems.

Future dialogue-backed world events should be added as registry data and
projected through the owning player's `StoryState`.
