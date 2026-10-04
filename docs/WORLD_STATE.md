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
