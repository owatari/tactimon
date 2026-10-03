# Capture System v0.1

## Eligibility

A ball can be thrown only when the encounter allows capture, the target is a living capturable wild Pokémon, it has not already received an attempt, and it is at or below the HP threshold.

Default threshold: **10% max HP**. The UI should clearly mark a target as capturable.

Bosses, raids, Trainer-owned Pokémon and selected scripted encounters use `capturePolicy: forbidden`.

## One attempt per target

Each wild Pokémon can receive one capture attempt per encounter. The acting Pokémon gives up its offensive action to attempt it.

Success removes the target as captured and awards 100% of its normal encounter XP.

Failure consumes the ball, the target immediately flees, and reduced XP is awarded based on remaining HP.

## Failure XP curve

Initial data-driven points, interpolated between values:

| HP at attempt | XP on failure |
| ---: | ---: |
| 10% | 50% |
| 5% | 75% |
| 1% | 80% |
| 0% | 80% |

This makes careful weakening useful even when the single catch roll fails.

## Probability

Eligibility and probability are separate. Catch chance uses species capture difficulty, ball modifier, HP within the legal window, status and encounter modifiers. Sleep/Freeze should normally help more than Burn/Poison/Paralysis. Constants remain server-authoritative and data-driven for telemetry-driven tuning.
