"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createPokemonProgression,
  grantTrainerBattleProgressToParty,
  grantWildBattleProgressToParty,
  normalizeDuelMajorStatus,
  normalizeDuelMovePp,
  type DuelItemId,
  type DuelMajorStatus,
  type DuelMovePp,
  type DuelPokemonBuild,
  type PokemonProgression,
  type ProgressionReward,
  type StarterSpeciesId,
} from "@tactimon/battle-engine";
import {
  resolveWhiteOutRespawn,
  type BattleSceneContext,
} from "@/lib/maps";
import {
  FirstBattle,
  type BattleEncounter,
  type BattleOutcome,
} from "@/components/FirstBattle";
import { BlackoutOverlay } from "@/components/BlackoutOverlay";
import { GameMusic } from "@/components/GameMusic";
import { MartOverlay } from "@/components/MartOverlay";
import { OverworldGame } from "@/components/OverworldGame";
import { ProgressionOverlay } from "@/components/ProgressionOverlay";
import { StarterChoice } from "@/components/StarterChoice";
import { StorageOverlay } from "@/components/StorageOverlay";
import {
  buyMartItem,
  type MartPurchaseResult,
} from "@/lib/mart";
import {
  ROUTE24_NUGGET_REWARD_ID,
  ROUTE24_ROCKET_TRAINER_ID,
} from "@/lib/trainers";
import {
  applyStoryWhiteOut,
  chooseMtMoonFossil,
  chooseStarter,
  collectOverworldItem,
  collectStoryValuable,
  DEFAULT_STORY_STATE,
  depositCapturedPokemon,
  healStoryParty,
  normalizeStoryState,
  placeCapturedPokemon,
  registerStoryHealLocation,
  storyCanCapturePokemon,
  storyHasHealthyPokemon,
  withdrawBoxedPokemon,
  type PokemonStorageActionResult,
  type StoryState,
} from "@/lib/story";

const STORAGE_KEY = "tactimon.story.v1";

type BattleSession = {
  context: BattleSceneContext;
  encounter: BattleEncounter;
  partyIndices: number[];
};

type PendingWhiteOut = {
  id: number;
  moneyLost: number;
  healLocationId: StoryState["healLocationId"];
};

type RespawnRequest = {
  id: number;
  mapId: string;
  spawn: { x: number; y: number };
};

type ProgressionQueueEntry = {
  partyIndex: number;
  reward: ProgressionReward;
  position: number;
  total: number;
};

function applyPartyProgressionRewards(
  current: StoryState,
  rewards: readonly ProgressionReward[],
  partyIndices: readonly number[],
): StoryState {
  let playerPokemon = current.playerPokemon;
  const capturedPokemon = [...current.capturedPokemon];

  rewards.forEach((reward, rewardIndex) => {
    const partyIndex = partyIndices[rewardIndex];
    if (partyIndex === undefined) {
      return;
    }

    if (partyIndex === 0) {
      playerPokemon = reward.progression;
      return;
    }

    const capturedIndex = partyIndex - 1;
    const existing = capturedPokemon[capturedIndex];
    if (!existing) {
      return;
    }

    capturedPokemon[capturedIndex] = {
      ...reward.progression,
      species: existing.species,
    };
  });

  return {
    ...current,
    playerPokemon,
    capturedPokemon: capturedPokemon.slice(0, 5),
  };
}

function applyBattleHealth(
  current: StoryState,
  partyIndices: readonly number[],
  playerHp: readonly number[],
  playerStatuses: readonly DuelMajorStatus[],
  playerMovePp: readonly DuelMovePp[],
): StoryState {
  let playerPokemon = current.playerPokemon;
  const capturedPokemon = [...current.capturedPokemon];

  partyIndices.forEach((partyIndex, outcomeIndex) => {
    const hp = playerHp[outcomeIndex];
    if (
      typeof hp !== "number" ||
      !Number.isFinite(hp)
    ) {
      return;
    }

    const currentHp = Math.max(0, Math.trunc(hp));
    const status: DuelMajorStatus =
      normalizeDuelMajorStatus(
        playerStatuses[outcomeIndex],
      );

    if (partyIndex === 0) {
      if (playerPokemon) {
        playerPokemon = {
          ...playerPokemon,
          currentHp,
          status,
          movePp: normalizeDuelMovePp(
            playerPokemon.activeMoves,
            playerMovePp[outcomeIndex],
          ),
        };
      }
      return;
    }

    const capturedIndex = partyIndex - 1;
    const existing = capturedPokemon[capturedIndex];
    if (existing) {
      capturedPokemon[capturedIndex] = {
        ...existing,
        currentHp,
        status,
        movePp: normalizeDuelMovePp(
          existing.activeMoves,
          playerMovePp[outcomeIndex],
        ),
      };
    }
  });

  return {
    ...current,
    playerPokemon,
    capturedPokemon,
  };
}

function progressionQueueFor(
  rewards: readonly ProgressionReward[],
  partyIndices: readonly number[],
): ProgressionQueueEntry[] {
  const visible = rewards
    .map((reward, rewardIndex) => ({
      partyIndex:
        partyIndices[rewardIndex] ?? rewardIndex,
      reward,
    }))
    .filter(
      ({ reward }) =>
        reward.xpGained > 0 ||
        reward.levelsGained > 0 ||
        reward.autoLearnedMoves.length > 0 ||
        reward.pendingMoves.length > 0,
    );

  return visible.map((entry, index) => ({
    ...entry,
    position: index + 1,
    total: visible.length,
  }));
}

export function GameClient() {
  const [story, setStory] = useState<StoryState>(
    DEFAULT_STORY_STATE,
  );
  const [starterChoiceOpen, setStarterChoiceOpen] =
    useState(false);
  const [martOpen, setMartOpen] = useState(false);
  const [storageOpen, setStorageOpen] =
    useState(false);
  const [battleSession, setBattleSession] =
    useState<BattleSession | null>(null);
  const [progressionQueue, setProgressionQueue] =
    useState<ProgressionQueueEntry[]>([]);
  const [pendingWhiteOut, setPendingWhiteOut] =
    useState<PendingWhiteOut | null>(null);
  const [respawnRequest, setRespawnRequest] =
    useState<RespawnRequest | null>(null);
  const whiteOutNonceRef = useRef(0);
  const [mapAudioContext, setMapAudioContext] = useState<{
    mapId: string;
    musicId: number | null;
  }>({
    mapId: "pallet-town",
    musicId: 300,
  });

  const partyProgressions = useMemo<PokemonProgression[]>(() => {
    if (!story.playerPokemon) {
      return [];
    }

    return [
      story.playerPokemon,
      ...story.capturedPokemon,
    ].slice(0, 6);
  }, [story.capturedPokemon, story.playerPokemon]);

  const deployedParty = useMemo(
    () =>
      partyProgressions
        .map((pokemon, partyIndex) => ({
          pokemon,
          partyIndex,
        }))
        .filter(({ pokemon }) => pokemon.currentHp > 0),
    [partyProgressions],
  );

  const battleParty = useMemo<DuelPokemonBuild[]>(
    () =>
      deployedParty.map(({ pokemon }) => ({
        species: pokemon.species,
        level: pokemon.level,
        moves: [...pokemon.activeMoves],
        movePp: { ...pokemon.movePp },
        evs: pokemon.evs,
        currentHp: pokemon.currentHp,
        status: pokemon.status,
      })),
    [deployedParty],
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setStory(
          normalizeStoryState(
            JSON.parse(stored) as Partial<StoryState>,
          ),
        );
      }
    } catch {
      // Local storage is an enhancement, not a runtime dependency.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(story),
      );
    } catch {
      // Ignore unavailable storage.
    }
  }, [story]);

  const handleMapAudioContextChange = useCallback(
    (next: { mapId: string; musicId: number | null }) => {
      setMapAudioContext((current) =>
        current.mapId === next.mapId &&
        current.musicId === next.musicId
          ? current
          : next,
      );

      if (next.mapId === "viridian-pokemon-center") {
        setStory((current) =>
          registerStoryHealLocation(
            current,
            "viridian-city",
          ),
        );
      } else if (
        next.mapId === "pewter-pokemon-center"
      ) {
        setStory((current) =>
          registerStoryHealLocation(
            current,
            "pewter-city",
          ),
        );
      } else if (
        next.mapId === "cerulean-pokemon-center"
      ) {
        setStory((current) =>
          registerStoryHealLocation(
            current,
            "cerulean-city",
          ),
        );
      } else if (
        next.mapId === "route-4-pokemon-center"
      ) {
        setStory((current) =>
          registerStoryHealLocation(
            current,
            "route-4",
          ),
        );
      }
    },
    [],
  );

  const handleChooseStarter = (
    starter: StarterSpeciesId,
  ) => {
    setStory(chooseStarter(starter));
    setStarterChoiceOpen(false);
  };

  const handleBattleComplete = (
    outcome: BattleOutcome,
  ) => {
    const session = battleSession;
    setBattleSession(null);

    if (!session) {
      return;
    }

    setStory((current) => ({
      ...applyBattleHealth(
        current,
        session.partyIndices,
        outcome.playerHp,
        outcome.playerStatuses,
        outcome.playerMovePp,
      ),
      inventory: { ...outcome.inventory },
    }));

    const fullPartySnapshot = story.playerPokemon
      ? [
          story.playerPokemon,
          ...story.capturedPokemon,
        ].slice(0, 6)
      : [];
    const partySnapshot = session.partyIndices
      .map((partyIndex, outcomeIndex) => {
        const pokemon = fullPartySnapshot[partyIndex];
        if (!pokemon) {
          return null;
        }

        const hp = outcome.playerHp[outcomeIndex];
        const status: DuelMajorStatus =
          normalizeDuelMajorStatus(
            outcome.playerStatuses[outcomeIndex],
          );
        return {
          ...pokemon,
          status,
          movePp: normalizeDuelMovePp(
            pokemon.activeMoves,
            outcome.playerMovePp[outcomeIndex],
          ),
          currentHp:
            typeof hp === "number" && Number.isFinite(hp)
              ? Math.max(0, Math.trunc(hp))
              : pokemon.currentHp,
        };
      })
      .filter(
        (pokemon): pokemon is PokemonProgression =>
          pokemon !== null,
      );

    if (session.encounter.kind === "trainer") {
      const rewards =
        partySnapshot.length > 0 &&
        outcome.defeatedEnemies.length > 0
          ? grantTrainerBattleProgressToParty(
              partySnapshot,
              outcome.defeatedEnemies,
            )
          : [];
      const trainerId =
        session.encounter.trainerId;
      const prizeMoney = outcome.won
        ? Math.max(
            0,
            Math.trunc(
              session.encounter.rewardMoney ?? 0,
            ),
          )
        : 0;

      setStory((current) => {
        let next = applyPartyProgressionRewards(
          current,
          rewards,
          session.partyIndices,
        );

        if (trainerId) {
          if (
            outcome.won &&
            !next.defeatedTrainerIds.includes(trainerId)
          ) {
            next = {
              ...next,
              defeatedTrainerIds: [
                ...next.defeatedTrainerIds,
                trainerId,
              ],
            };
          }

          const badgeId =
            session.encounter.badgeId;
          if (
            outcome.won &&
            badgeId &&
            !next.badgeIds.includes(badgeId)
          ) {
            next = {
              ...next,
              badgeIds: [...next.badgeIds, badgeId],
            };
          }

          return {
            ...next,
            money: Math.min(
              999_999,
              next.money + prizeMoney,
            ),
          };
        }

        return {
          ...next,
          firstBattleComplete: true,
          money: Math.min(
            999_999,
            next.money + prizeMoney,
          ),
        };
      });

      setProgressionQueue(
        progressionQueueFor(
          rewards,
          session.partyIndices,
        ),
      );
      return;
    }

    if (outcome.escaped || !story.playerPokemon) {
      return;
    }

    const xpRatio =
      outcome.capture?.xpRatio ??
      (outcome.won ? 1 : 0);
    if (xpRatio <= 0) {
      return;
    }

    const rewards = grantWildBattleProgressToParty(
      partySnapshot,
      {
        species: session.encounter.species,
        level: session.encounter.level,
      },
      xpRatio,
    );

    setStory((current) => {
      const next = applyPartyProgressionRewards(
        current,
        rewards,
        session.partyIndices,
      );

      if (!outcome.capture?.success) {
        return next;
      }

      const captured = createPokemonProgression(
        outcome.capture.species,
        outcome.capture.level,
      );

      return placeCapturedPokemon(
        next,
        {
          ...captured,
          species: outcome.capture.species,
          status: outcome.capture.status,
        },
      ).story;
    });

    setProgressionQueue(
      progressionQueueFor(
        rewards,
        session.partyIndices,
      ),
    );
  };

  useEffect(() => {
    if (
      battleSession ||
      pendingWhiteOut ||
      !story.playerPokemon ||
      storyHasHealthyPokemon(story)
    ) {
      return;
    }

    const result = applyStoryWhiteOut(story);
    const id = whiteOutNonceRef.current + 1;
    whiteOutNonceRef.current = id;

    setStory(result.story);
    setPendingWhiteOut({
      id,
      moneyLost: result.moneyLost,
      healLocationId: result.healLocationId,
    });
  }, [
    battleSession,
    pendingWhiteOut,
    story,
  ]);

  const continueAfterWhiteOut = () => {
    if (!pendingWhiteOut) {
      return;
    }

    const respawn = resolveWhiteOutRespawn(
      pendingWhiteOut.healLocationId,
    );

    setRespawnRequest({
      id: pendingWhiteOut.id,
      ...respawn,
    });
    setPendingWhiteOut(null);
  };

  const handleMartPurchase = (
    itemId: DuelItemId,
    quantity: number,
  ): MartPurchaseResult => {
    const preview = buyMartItem(
      story.money,
      story.inventory,
      itemId,
      quantity,
    );

    if (!preview.accepted) {
      return preview;
    }

    setStory((current) => {
      const result = buyMartItem(
        current.money,
        current.inventory,
        itemId,
        quantity,
      );

      if (!result.accepted) {
        return current;
      }

      return {
        ...current,
        money: result.money,
        inventory: result.inventory,
      };
    });

    return preview;
  };

  const handleStorageDeposit = (
    capturedIndex: number,
  ): PokemonStorageActionResult => {
    const preview = depositCapturedPokemon(
      story,
      capturedIndex,
    );

    if (preview.accepted) {
      setStory((current) =>
        depositCapturedPokemon(
          current,
          capturedIndex,
        ).story,
      );
    }

    return preview;
  };

  const handleStorageWithdraw = (
    boxedIndex: number,
  ): PokemonStorageActionResult => {
    const preview = withdrawBoxedPokemon(
      story,
      boxedIndex,
    );

    if (preview.accepted) {
      setStory((current) =>
        withdrawBoxedPokemon(
          current,
          boxedIndex,
        ).story,
      );
    }

    return preview;
  };

  const finishProgression = (
    progression: PokemonProgression,
  ) => {
    const currentEntry = progressionQueue[0];
    if (!currentEntry) {
      return;
    }

    setStory((current) => {
      if (currentEntry.partyIndex === 0) {
        return {
          ...current,
          playerPokemon: progression,
        };
      }

      const capturedIndex =
        currentEntry.partyIndex - 1;

      return {
        ...current,
        capturedPokemon: current.capturedPokemon.map(
          (pokemon, index) =>
            index === capturedIndex
              ? {
                  ...progression,
                  species: pokemon.species,
                }
              : pokemon,
        ),
      };
    });

    setProgressionQueue((current) =>
      current.slice(1),
    );
  };

  const paused =
    starterChoiceOpen ||
    martOpen ||
    storageOpen ||
    Boolean(battleSession) ||
    Boolean(pendingWhiteOut) ||
    progressionQueue.length > 0;
  const battleMusicKind = battleSession
    ? battleSession.encounter.kind === "wild"
      ? "wild"
      : "rival"
    : null;

  return (
    <div className="game-client">
      <GameMusic
        mapId={mapAudioContext.mapId}
        mapMusicId={mapAudioContext.musicId}
        battleKind={battleMusicKind}
      />

      <OverworldGame
        story={story}
        paused={paused}
        respawnRequest={respawnRequest}
        onRequestStarterChoice={() => setStarterChoiceOpen(true)}
        onMapAudioContextChange={handleMapAudioContextChange}
        onFirstBattleTrigger={(context) => {
          if (
            story.starter &&
            story.playerPokemon &&
            !story.firstBattleComplete &&
            battleParty.length > 0
          ) {
            setBattleSession({
              context,
              partyIndices: deployedParty.map(
                ({ partyIndex }) => partyIndex,
              ),
              encounter: {
                kind: "trainer",
                trainerName: "Blue",
                rewardMoney: 80,
              },
            });
          }
        }}
        onWildBattleTrigger={(context, encounter) => {
          if (
            story.starter &&
            story.playerPokemon &&
            story.firstBattleComplete &&
            battleParty.length > 0
          ) {
            setBattleSession({
              context,
              partyIndices: deployedParty.map(
                ({ partyIndex }) => partyIndex,
              ),
              encounter: {
                kind: "wild",
                species: encounter.species,
                level: encounter.level,
              },
            });
          }
        }}
        onTrainerBattleTrigger={(context, trainer) => {
          if (
            story.starter &&
            story.playerPokemon &&
            story.firstBattleComplete &&
            !story.defeatedTrainerIds.includes(trainer.id) &&
            battleParty.length > 0
          ) {
            if (
              trainer.id ===
              ROUTE24_ROCKET_TRAINER_ID
            ) {
              setStory((current) =>
                collectStoryValuable(
                  current,
                  ROUTE24_NUGGET_REWARD_ID,
                  "nugget",
                ).story,
              );
            }

            setBattleSession({
              context,
              partyIndices: deployedParty.map(
                ({ partyIndex }) => partyIndex,
              ),
              encounter: {
                kind: "trainer",
                trainerId: trainer.id,
                trainerName: trainer.name,
                rewardMoney: trainer.rewardMoney,
                badgeId: trainer.badgeId,
                rivals: trainer.party,
              },
            });
          }
        }}
        onMartOpen={() => setMartOpen(true)}
        onPokemonCenterHeal={() =>
          setStory((current) => healStoryParty(current))
        }
        onPokemonStorageOpen={() =>
          setStorageOpen(true)
        }
        onMtMoonFossilChoice={(fossil) => {
          const preview = chooseMtMoonFossil(
            story,
            fossil,
          );

          if (preview.accepted) {
            setStory((current) =>
              chooseMtMoonFossil(
                current,
                fossil,
              ).story,
            );
          }

          return {
            accepted: preview.accepted,
            reason: preview.reason,
          };
        }}
        onOverworldItemPickup={(pickupId, itemId) => {
          const preview = collectOverworldItem(
            story,
            pickupId,
            itemId,
          );

          if (preview.accepted) {
            setStory((current) =>
              collectOverworldItem(
                current,
                pickupId,
                itemId,
              ).story,
            );
          }

          return {
            accepted: preview.accepted,
            reason: preview.reason,
          };
        }}
      />

      {starterChoiceOpen && !story.starter && (
        <StarterChoice
          onChoose={handleChooseStarter}
          onClose={() => setStarterChoiceOpen(false)}
        />
      )}

      {martOpen && (
        <MartOverlay
          money={story.money}
          inventory={story.inventory}
          onBuy={handleMartPurchase}
          onClose={() => setMartOpen(false)}
        />
      )}

      {storageOpen && (
        <StorageOverlay
          starter={story.playerPokemon}
          party={story.capturedPokemon}
          storage={story.boxedPokemon}
          onDeposit={handleStorageDeposit}
          onWithdraw={handleStorageWithdraw}
          onClose={() => setStorageOpen(false)}
        />
      )}

      {battleSession &&
        story.starter &&
        story.playerPokemon &&
        deployedParty[0] && (
          <FirstBattle
            starter={story.starter}
            progression={deployedParty[0].pokemon}
            party={battleParty}
            captureAllowed={storyCanCapturePokemon(story)}
            inventory={story.inventory}
            encounter={battleSession.encounter}
            context={battleSession.context}
            onComplete={handleBattleComplete}
          />
        )}

      {pendingWhiteOut &&
        progressionQueue.length === 0 && (
          <BlackoutOverlay
            moneyLost={pendingWhiteOut.moneyLost}
            locationLabel={
              pendingWhiteOut.healLocationId ===
                "cerulean-city"
                ? "Cerulean Pokémon Center"
                : pendingWhiteOut.healLocationId ===
                    "route-4"
                  ? "Route 4 Pokémon Center"
                  : pendingWhiteOut.healLocationId ===
                      "pewter-city"
                  ? "Pewter Pokémon Center"
                  : pendingWhiteOut.healLocationId ===
                      "viridian-city"
                    ? "Viridian Pokémon Center"
                    : "Pallet Town"
            }
            onContinue={continueAfterWhiteOut}
          />
        )}

      {progressionQueue[0] && (
        <ProgressionOverlay
          key={`${progressionQueue[0].partyIndex}-${progressionQueue[0].reward.experienceAfter}`}
          reward={progressionQueue[0].reward}
          position={progressionQueue[0].position}
          total={progressionQueue[0].total}
          onComplete={finishProgression}
        />
      )}
    </div>
  );
}
