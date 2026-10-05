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
  grantWildBattlesProgressToParty,
  normalizeDuelMajorStatus,
  normalizeDuelMovePp,
  normalizeDuelSleepTurns,
  speciesDisplayName,
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
import { BattleResultsScreen } from "@/components/BattleResultsScreen";
import {
  describeBattleResult,
  type BattleResultHeadline,
} from "@/lib/battleResult";
import { BlackoutOverlay } from "@/components/BlackoutOverlay";
import { GameMusic } from "@/components/GameMusic";
import { MartOverlay } from "@/components/MartOverlay";
import { StartMenu } from "@/components/StartMenu";
import { markPokedexSeen } from "@/lib/pokedex";
import {
  DEFAULT_GAME_OPTIONS,
  effectiveMusicVolume,
  loadGameOptions,
  saveGameOptions,
  type GameOptions,
} from "@/lib/options";
import { musicManager } from "@/lib/music";
import type { OverworldItemId } from "@/lib/items";
import { OverworldGame } from "@/components/OverworldGame";
import { ProgressionOverlay } from "@/components/ProgressionOverlay";
import { StarterChoice } from "@/components/StarterChoice";
import { StorageOverlay } from "@/components/StorageOverlay";
import {
  buyMartItem,
  martStockFor,
  type MartPurchaseResult,
} from "@/lib/mart";
import {
  applyBattleInventory,
  toBattleInventory,
} from "@/lib/itemUse";
import {
  ROUTE24_NUGGET_REWARD_ID,
  ROUTE24_ROCKET_TRAINER_ID,
} from "@/lib/trainers";
import {
  applyStoryWhiteOut,
  chooseStarter,
  collectStoryValuable,
  completeTutorialRivalBattle,
  DEFAULT_STORY_STATE,
  depositCapturedPokemon,
  grantStoryBadge,
  isStoryTrainerDefeated,
  markStoryTrainerDefeated,
  normalizeStoryState,
  placeCapturedPokemon,
  registerStoryHealLocation,
  shouldStartStoryWhiteOut,
  storyCanCapturePokemon,
  withdrawBoxedPokemon,
  type PokemonStorageActionResult,
  type StoryState,
} from "@/lib/story";
import {
  runDialogueInteraction,
  type DialogueInteractionRequest,
  type DialoguePresentation,
} from "@/lib/dialogueSystem";
import {
  chooseBestStorySave,
  serializeStorySave,
  STORY_BACKUP_STORAGE_KEY,
  STORY_STORAGE_KEY,
} from "@/lib/storyPersistence";

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
  playerSleepTurnsRemaining: readonly number[],
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
    const sleepTurnsRemaining =
      normalizeDuelSleepTurns(
        status,
        playerSleepTurnsRemaining[
          outcomeIndex
        ],
      );

    if (partyIndex === 0) {
      if (playerPokemon) {
        playerPokemon = {
          ...playerPokemon,
          currentHp,
          status,
          sleepTurnsRemaining,
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
        sleepTurnsRemaining,
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

function pendingMoveQueue(
  entries: readonly ProgressionQueueEntry[],
): ProgressionQueueEntry[] {
  const pending = entries.filter(
    (entry) => entry.reward.pendingMoves.length > 0,
  );

  return pending.map((entry, index) => ({
    ...entry,
    position: index + 1,
    total: pending.length,
  }));
}

export function GameClient() {
  const [story, setStory] = useState<StoryState>(
    DEFAULT_STORY_STATE,
  );
  const [storyHydrated, setStoryHydrated] =
    useState(false);
  const [starterChoiceOpen, setStarterChoiceOpen] =
    useState(false);
  const [martId, setMartId] = useState<string | null>(null);
  const martOpen = martId !== null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [options, setOptions] = useState<GameOptions>(
    DEFAULT_GAME_OPTIONS,
  );
  const pendingPlaySecondsRef = useRef(0);
  const [storageOpen, setStorageOpen] =
    useState(false);
  const [battleSession, setBattleSession] =
    useState<BattleSession | null>(null);
  const [progressionQueue, setProgressionQueue] =
    useState<ProgressionQueueEntry[]>([]);
  const [battleResult, setBattleResult] = useState<{
    headline: BattleResultHeadline;
    prizeMoney: number;
    rewards: ProgressionQueueEntry[];
  } | null>(null);
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
        sleepTurnsRemaining:
          pokemon.sleepTurnsRemaining,
      })),
    [deployedParty],
  );

  useEffect(() => {
    try {
      const primary = window.localStorage.getItem(
        STORY_STORAGE_KEY,
      );
      const backup = window.localStorage.getItem(
        STORY_BACKUP_STORAGE_KEY,
      );

      setStory(
        chooseBestStorySave(primary, backup),
      );
    } catch {
      setStory(
        normalizeStoryState(DEFAULT_STORY_STATE),
      );
    } finally {
      setStoryHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!storyHydrated) {
      return;
    }

    try {
      const serialized = serializeStorySave(story);
      const previous = window.localStorage.getItem(
        STORY_STORAGE_KEY,
      );

      if (previous && previous !== serialized) {
        window.localStorage.setItem(
          STORY_BACKUP_STORAGE_KEY,
          previous,
        );
      }

      window.localStorage.setItem(
        STORY_STORAGE_KEY,
        serialized,
      );
    } catch {
      // Local storage is an enhancement, not a runtime dependency.
    }
  }, [story, storyHydrated]);

  useEffect(() => {
    setOptions(loadGameOptions());
  }, []);

  useEffect(() => {
    musicManager.setMasterVolume(
      effectiveMusicVolume(options),
    );
  }, [options]);

  const flushPlayTime = useCallback(() => {
    const seconds = pendingPlaySecondsRef.current;
    if (seconds <= 0) return;
    pendingPlaySecondsRef.current = 0;
    setStory((current) => ({
      ...current,
      playTimeSeconds:
        (current.playTimeSeconds ?? 0) + seconds,
    }));
  }, []);

  useEffect(() => {
    if (!storyHydrated) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      pendingPlaySecondsRef.current += 1;
      if (pendingPlaySecondsRef.current >= 30) {
        flushPlayTime();
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [storyHydrated, flushPlayTime]);

  const handleOptionsChange = useCallback(
    (next: GameOptions) => {
      setOptions(next);
      saveGameOptions(next);
    },
    [],
  );

  useEffect(() => {
    if (!battleSession) return;
    const encounter = battleSession.encounter;
    const species =
      encounter.kind === "wild"
        ? [
            encounter.species,
            ...(encounter.wilds ?? []).map((w) => w.species),
          ]
        : (encounter.rivals ?? []).map((r) => r.species);
    setStory((current) => markPokedexSeen(current, species));
  }, [battleSession]);

  const handleMenuSave = useCallback(() => {
    flushPlayTime();
    return "Jogo salvo!";
  }, [flushPlayTime]);

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
        next.mapId === "vermilion-pokemon-center"
      ) {
        setStory((current) =>
          registerStoryHealLocation(
            current,
            "vermilion-city",
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

    const isTutorial =
      session.encounter.kind === "trainer" &&
      !session.encounter.trainerId;
    const resultPrizeMoney =
      session.encounter.kind === "trainer" && outcome.won
        ? Math.max(
            0,
            Math.trunc(session.encounter.rewardMoney ?? 0),
          )
        : 0;
    const headline = describeBattleResult({
      won: outcome.won,
      escaped: outcome.escaped,
      escapedBy: outcome.escapedBy,
      encounterKind: session.encounter.kind,
      opponentName: outcome.opponentName,
      opponentCount: outcome.opponentCount,
      tutorial: isTutorial,
      prizeMoney: resultPrizeMoney,
      capture: outcome.capture
        ? {
            success: outcome.capture.success,
            speciesName: speciesDisplayName(
              outcome.capture.species,
            ),
            level: outcome.capture.level,
            destination: outcome.capture.success
              ? placeCapturedPokemon(
                  story,
                  createPokemonProgression(
                    outcome.capture.species,
                    outcome.capture.level,
                  ),
                ).destination ?? null
              : null,
          }
        : undefined,
    });
    const showResult = (
      rewards: ProgressionQueueEntry[],
    ) =>
      setBattleResult({
        headline,
        prizeMoney: resultPrizeMoney,
        rewards,
      });

    setStory((current) =>
      applyBattleInventory(
        applyBattleHealth(
          current,
          session.partyIndices,
          outcome.playerHp,
          outcome.playerStatuses,
          outcome.playerSleepTurnsRemaining,
          outcome.playerMovePp,
        ),
        outcome.inventory,
      ),
    );

    const fullPartySnapshot = story.playerPokemon
      ? [
          story.playerPokemon,
          ...story.capturedPokemon,
        ].slice(0, 6)
      : [];
    const partySnapshot = session.partyIndices
      .map<PokemonProgression | null>((partyIndex, outcomeIndex) => {
        const pokemon = fullPartySnapshot[partyIndex];
        if (!pokemon) {
          return null;
        }

        const hp = outcome.playerHp[outcomeIndex];
        const status: DuelMajorStatus =
          normalizeDuelMajorStatus(
            outcome.playerStatuses[outcomeIndex],
          );
        const sleepTurnsRemaining =
          normalizeDuelSleepTurns(
            status,
            outcome.playerSleepTurnsRemaining[
              outcomeIndex
            ],
          );
        return {
          ...pokemon,
          status,
          sleepTurnsRemaining,
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
      const badgeId =
        session.encounter.badgeId;
      const prizeMoney = resultPrizeMoney;

      setStory((current) => {
        let next = applyPartyProgressionRewards(
          current,
          rewards,
          session.partyIndices,
        );

        if (trainerId) {
          if (outcome.won) {
            next = markStoryTrainerDefeated(
              next,
              trainerId,
            );
          }

          if (outcome.won && badgeId) {
            next = grantStoryBadge(next, badgeId);
          }

          return {
            ...next,
            money: Math.min(
              999_999,
              next.money + prizeMoney,
            ),
          };
        }

        // Oak's Lab rival battle: tutorial, never a whiteout.
        return completeTutorialRivalBattle({
          ...next,
          money: Math.min(
            999_999,
            next.money + prizeMoney,
          ),
        });
      });

      const progressionEntries =
        progressionQueueFor(
          rewards,
          session.partyIndices,
        );
      showResult(progressionEntries);
      setProgressionQueue(
        pendingMoveQueue(progressionEntries),
      );
      return;
    }

    if (!story.playerPokemon) {
      showResult([]);
      return;
    }

    const defeatedWilds =
      outcome.defeatedEnemies.map((enemy) => ({
        species:
          enemy.species as typeof session.encounter.species,
        level: enemy.level,
        xpRatio: 1,
      }));
    const rewardEnemies = [
      ...defeatedWilds,
      ...(outcome.capture
        ? [
            {
              species: outcome.capture.species,
              level: outcome.capture.level,
              xpRatio: outcome.capture.xpRatio,
            },
          ]
        : []),
    ];
    if (rewardEnemies.length === 0 && outcome.won) {
      rewardEnemies.push({
        species: session.encounter.species,
        level: session.encounter.level,
        xpRatio: 1,
      });
    }

    if (rewardEnemies.length === 0) {
      showResult([]);
      return;
    }

    const rewards =
      grantWildBattlesProgressToParty(
        partySnapshot,
        rewardEnemies,
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
          sleepTurnsRemaining:
            outcome.capture.sleepTurnsRemaining,
        },
      ).story;
    });

    const progressionEntries =
      progressionQueueFor(
        rewards,
        session.partyIndices,
      );
    showResult(progressionEntries);
    setProgressionQueue(
      pendingMoveQueue(progressionEntries),
    );
  };

  useEffect(() => {
    if (
      !shouldStartStoryWhiteOut(story, {
        battleActive: Boolean(battleSession),
        whiteOutPending: Boolean(pendingWhiteOut),
      })
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
    itemId: OverworldItemId,
    quantity: number,
  ): MartPurchaseResult => {
    const stock = martStockFor(martId ?? "viridian-mart");
    const preview = buyMartItem(
      story.money,
      story.inventory,
      itemId,
      quantity,
      story.bagItems ?? {},
      stock,
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
        current.bagItems ?? {},
        stock,
      );

      if (!result.accepted) {
        return current;
      }

      return {
        ...current,
        money: result.money,
        inventory: result.inventory,
        bagItems: result.bagItems,
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

  const handleDialogueInteraction = (
    request: DialogueInteractionRequest,
  ): DialoguePresentation => {
    const preview = runDialogueInteraction(
      story,
      request,
    );

    if (preview.story !== story) {
      setStory((current) =>
        runDialogueInteraction(
          current,
          request,
        ).story,
      );
    }

    return preview.presentation;
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

  if (!storyHydrated) {
    return (
      <div
        className="game-client"
        aria-busy="true"
        aria-label="Carregando save local"
      />
    );
  }

  const paused =
    starterChoiceOpen ||
    martOpen ||
    menuOpen ||
    storageOpen ||
    Boolean(battleSession) ||
    Boolean(pendingWhiteOut) ||
    Boolean(battleResult) ||
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
        onMenuOpen={() => {
          flushPlayTime();
          setMenuOpen(true);
        }}
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
                wilds: encounter.members,
                areaLevel: encounter.areaLevel,
                equivalentPartyStrength:
                  encounter.equivalentPartyStrength,
              },
            });
          }
        }}
        onTrainerBattleTrigger={(context, trainer) => {
          if (
            story.starter &&
            story.playerPokemon &&
            story.firstBattleComplete &&
            !isStoryTrainerDefeated(story, trainer.id) &&
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
        onMartOpen={(id) => setMartId(id)}
        onRespawnApplied={(id) =>
          setRespawnRequest((current) =>
            current?.id === id ? null : current,
          )
        }
        onStoryUpdate={(update) => {
          setStory((current) => update(current));
        }}
        onDialogueInteraction={handleDialogueInteraction}
        onPokemonStorageOpen={() =>
          setStorageOpen(true)
        }

      />

      {starterChoiceOpen && !story.starter && (
        <StarterChoice
          onChoose={handleChooseStarter}
          onClose={() => setStarterChoiceOpen(false)}
        />
      )}

      {menuOpen && (
        <StartMenu
          story={story}
          options={options}
          onStoryChange={setStory}
          onOptionsChange={handleOptionsChange}
          onSave={handleMenuSave}
          onItemReward={(reward, partyIndex) => {
            const queue = pendingMoveQueue(
              progressionQueueFor([reward], [partyIndex]),
            );
            if (queue.length > 0) {
              setMenuOpen(false);
              setProgressionQueue(queue);
            }
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {martOpen && (
        <MartOverlay
          martId={martId}
          money={story.money}
          inventory={story.inventory}
          bagItems={story.bagItems ?? {}}
          onBuy={handleMartPurchase}
          onClose={() => setMartId(null)}
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
            inventory={toBattleInventory(story)}
            encounter={battleSession.encounter}
            context={battleSession.context}
            onComplete={handleBattleComplete}
            initialBattleSpeed={options.battleSpeed}
          />
        )}

      {pendingWhiteOut &&
        !battleResult &&
        progressionQueue.length === 0 && (
          <BlackoutOverlay
            moneyLost={pendingWhiteOut.moneyLost}
            locationLabel={
              pendingWhiteOut.healLocationId ===
                "vermilion-city"
                ? "Vermilion Pokémon Center"
                : pendingWhiteOut.healLocationId ===
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

      {battleResult && (
        <BattleResultsScreen
          headline={battleResult.headline}
          prizeMoney={battleResult.prizeMoney}
          rewards={battleResult.rewards.map(
            (entry) => entry.reward,
          )}
          onContinue={() => setBattleResult(null)}
        />
      )}

      {!battleResult &&
        progressionQueue[0] && (
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
