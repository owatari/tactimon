# Progression v0.1

## EV

EV is earned as Pokémon level instead of by defeating particular species. The intended final budget remains 510 with 252 per-stat caps unless playtesting changes it. The exact level-to-EV curve will be set after the Kanto/endgame level curve is known.

Allocation modes:

- **Manual:** spend EV directly.
- **Semi:** choose target percentages; future EV converges toward them.
- **Auto:** use a curated species/form profile appropriate to Tactimon's tactical metagame, like an experienced competitive player would choose. Auto never just splits evenly.

## Held unlocks

A Held drop has no item level. Binding it consumes/commits the inventory copy and permanently unlocks that Held effect on that specific Pokémon. The Pokémon can then switch freely among all effects it has unlocked. Unlocks do not transfer to another Pokémon.

## Berries

Berries share the active Held slot but are consumable. They may activate at battle start or on a trigger and can be weaker/conditional substitutes while a player saves a valuable Held for the Pokémon they want to bind it to.

## Horizontal endgame

Different dungeons/raids remain relevant through distinct TMs, Held unlock items, cosmetics, consumables and materials rather than increasingly high gear tiers.


## Implemented early-game progression

The current Route 1 prototype now persists starter progression:

- starter begins at level 5;
- wild victories award XP based on the defeated wild Pokémon's level;
- the provisional XP requirement is `40 + level × 15` per level;
- each level gained grants 6 EV points;
- EV comes from leveling, not from species-specific EV yields;
- the 6 EV points are automatically distributed with a curated starter profile for now;
- the canonical 510 total / 252 per-stat EV limits remain enforced.

The exact XP and EV curves are tuning values and can change once the full Kanto level curve is established.

### Learning moves

A Pokémon still has exactly four active move slots.

When leveling teaches a new move:

- if fewer than four slots are occupied, the new move is added automatically;
- if all four slots are occupied, the player may replace exactly one current move with the newly learned move;
- the player may also decline learning the new move;
- leveling does **not** open a free four-move loadout editor.

A future Move Tutor interface will be the place where the player can deliberately choose a four-move loadout from the species' eligible learnset.
