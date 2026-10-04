# Dialogue system

Tactimon uses one dialogue pipeline for static NPC text, multi-page dialogue,
choices, transient system messages and stateful progression.

## Registry-first rule

New dialogue is registered in `dialogueSystem.ts`.

Static dialogue defines `variants`. A variant may depend on the owning
player's `StoryState` and may return multiple pages or choices.

Stateful dialogue defines an `interact(story, context)` handler. It returns a
new private `StoryState` plus a `DialoguePresentation`.

Runtime callers use:

```ts
{
  kind: "script",
  id: "some-script",
  context: {
    eventId: "some-player-event",
  },
}
```

Adding a new scripted event should not require another branch in
`runDialogueInteraction` or `OverworldGame`.

## Player ownership

Stateful handlers only update the supplied player's story. Shared map, NPC,
trainer and room definitions remain immutable.

Combined with `PlayerWorldCondition` visibility rules, players standing on the
same map can independently see and complete pickups, fossils, Cut obstacles,
trainers, dialogue branches, doors, switches and future quest events.

## Compatibility

Legacy bespoke dialogue request kinds remain temporarily for old callers and
tests. Runtime gameplay uses registered scripts.
