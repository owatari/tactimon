"use client";

import { InputBridge } from "./InputBridge";
import { localizedSpeciesName as speciesDisplayName } from "@/lib/i18n/names";
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
  type DuelMajorStatus,
  type DuelMovePp,
  type DuelPokemonBuild,
  type PokemonProgression,
  type ProgressionReward,
  type StarterSpeciesId, rollPersonality,
  CAPTURE_EXP_BONUS,
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
import { initLocale, t, useLocale } from "@/lib/i18n";
import { clearAllSaves, wantsSaveReset } from "@/lib/saveReset";
import { applyPartyProgressionRewards } from "@/lib/partyProgress";
import { BattleResultsScreen } from "@/components/BattleResultsScreen";
import {
  describeBattleResult,
  type BattleResultHeadline,
} from "@/lib/battleResult";
import { BlackoutOverlay } from "@/components/BlackoutOverlay";
import { GameMusic } from "@/components/GameMusic";
import { useGameClock } from "@/lib/autoplay/gameClock";
import { fitExpShare, sharesForSlots } from "@/lib/expShare";
import { MarketWindow } from "@/components/MarketWindow";
import { StartMenu } from "@/components/StartMenu";
import type { MenuScreen } from "@/lib/gameMenu";
import {
  findHealLocation,
  findHealLocationByCenter,
} from "@/lib/healLocations";
import { isSpeciesCaught, markPokedexSeen, syncPokedexCaught } from "@/lib/pokedex";
import { hasPokedex, hasStoryPlayerEvent } from "@/lib/story";
import { PokedexRegistration } from "@/components/PokedexGba";
import {
  DEFAULT_GAME_OPTIONS,
  effectiveMusicVolume,
  loadGameOptions,
  saveGameOptions,
  type GameOptions,
} from "@/lib/options";
import { musicManager } from "@/lib/music";
import { OverworldGame } from "@/components/OverworldGame";
import { ProgressionOverlay } from "@/components/ProgressionOverlay";
import { StarterChoice } from "@/components/StarterChoice";
import { AutoPanel } from "@/components/AutoPanel";
import { PcWindow } from "@/components/PcWindow";
import {
  applyBattleInventory,
  toBattleInventory,
} from "@/lib/itemUse";
import { staticEncounterEventId } from "@/lib/questEvents";
import {
  ROUTE24_NUGGET_REWARD_ID,
  ROUTE24_ROCKET_TRAINER_ID,
} from "@/lib/trainers";
import {
  applyStoryWhiteOut,
  chooseStarter,
  collectStoryValuable,
  completeStoryPlayerEvent,
  completeTutorialRivalBattle,
  DEFAULT_STORY_STATE,
  depositCapturedPokemon,
  grantStoryBadge,
  isStoryTrainerDefeated,
  markStoryTrainerDefeated,
  normalizeStoryState,
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
import { CaptureSummary } from "./CaptureSummary";
import {
  holdCapturedPokemon,
  pendingCaptures,
  resolvePendingCapture,
  sendAllPendingToBox,
} from "@/lib/captureChoice";
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
  // Re-render the whole client when the language changes.
  useLocale();
  const [story, setStory] = useState<StoryState>(
    DEFAULT_STORY_STATE,
  );
  const [storyHydrated, setStoryHydrated] =
    useState(false);
  const [starterChoiceOpen, setStarterChoiceOpen] =
    useState(false);
  const [starterFocus, setStarterFocus] =
    useState<StarterSpeciesId | null>(null);
  const [starterPointer, setStarterPointer] = useState<{
    kind: "hover" | "click";
    starter: StarterSpeciesId;
    nonce: number;
  } | null>(null);
  const [martId, setMartId] = useState<string | null>(null);
  const martOpen = martId !== null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuScreen, setMenuScreen] = useState<MenuScreen | undefined>(undefined);
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

  // Every party member goes to battle, fainted ones included: they wait off the board and a Revive
  // can bring them back (task 031). `leadMember` is the first one that can actually fight.
  const deployedParty = useMemo(
    () =>
      partyProgressions.map((pokemon, partyIndex) => ({
        pokemon,
        partyIndex,
      })),
    [partyProgressions],
  );
  const leadMember = useMemo(
    () => deployedParty.find(({ pokemon }) => pokemon.currentHp > 0),
    [deployedParty],
  );

  const battleParty = useMemo<DuelPokemonBuild[]>(
    () =>
      deployedParty.map(({ pokemon }) => ({
        species: pokemon.species,
        level: pokemon.level,
        moves: [...pokemon.activeMoves],
        movePp: { ...pokemon.movePp },
        evs: pokemon.evs,
        ivs: pokemon.ivs,
        nature: pokemon.nature,
        nickname: pokemon.nickname,
        shiny: pokemon.shiny,
        currentHp: pokemon.currentHp,
        status: pokemon.status,
        sleepTurnsRemaining:
          pokemon.sleepTurnsRemaining,
      })),
    [deployedParty],
  );

  useEffect(() => {
    initLocale();
  }, []);

  useEffect(() => {
    try {
      if (wantsSaveReset(window.location.search)) {
        clearAllSaves(window.localStorage);
        window.history.replaceState(null, "", window.location.pathname);
      }
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

  const gameClock = useGameClock();
  useEffect(() => {
    // The Auto Player mutes the game whatever the options say.
    musicManager.setMasterVolume(
      gameClock.autoplay ? 0 : effectiveMusicVolume(options),
    );
  }, [options, gameClock.autoplay]);

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

  // Pokédex "caught" is permanent (owned, gifted, traded, evolved); the first time a species is
  // registered during play FireRed shows its entry. Saves loaded from disk register silently.
  const dexSyncedRef = useRef(false);
  // New species caught in battle are presented by the capture screen instead of the Pokédex page.
  const capturePageSpeciesRef = useRef(new Set<string>());
  const [dexRegistrations, setDexRegistrations] = useState<string[]>([]);
  useEffect(() => {
    if (!storyHydrated) return;
    const { story: synced, newlyCaught } = syncPokedexCaught(story);
    let next = synced;
    const champion = story.defeatedTrainerIds.some((id) =>
      id.startsWith("league-champion-blue-"),
    );
    if (champion && story.hofDebutSeconds === undefined) {
      next = { ...next, hofDebutSeconds: story.playTimeSeconds ?? 0 };
    }
    if (next !== story) setStory(next);
    const registrable = newlyCaught.filter(
      (species) => !capturePageSpeciesRef.current.delete(species),
    );
    if (
      dexSyncedRef.current &&
      registrable.length > 0 &&
      hasPokedex(next)
    ) {
      setDexRegistrations((queue) => [...queue, ...registrable]);
    }
    dexSyncedRef.current = true;
  }, [story, storyHydrated]);

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
    return t("Game saved!");
  }, [flushPlayTime]);

  const handleMapAudioContextChange = useCallback(
    (next: { mapId: string; musicId: number | null }) => {
      setMapAudioContext((current) =>
        current.mapId === next.mapId &&
        current.musicId === next.musicId
          ? current
          : next,
      );

      const heal = findHealLocationByCenter(next.mapId);
      if (heal) {
        setStory((current) =>
          registerStoryHealLocation(current, heal.id),
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
      captures: outcome.captures.map((caught) => ({
        speciesName: speciesDisplayName(caught.species),
        level: caught.level,
      })),
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

    const staticId =
      session.encounter.kind === "wild"
        ? session.encounter.staticId
        : undefined;
    if (staticId && (outcome.won || outcome.captures.length > 0)) {
      setStory((current) =>
        completeStoryPlayerEvent(
          current,
          "story",
          staticEncounterEventId(staticId),
        ),
      );
    }

    const fullPartySnapshot = story.playerPokemon
      ? [
          story.playerPokemon,
          ...story.capturedPokemon,
        ].slice(0, 6)
      : [];
    // Pokémon that started fainted and never got back up take no part in the rewards.
    const rewardPartyIndices = session.partyIndices.filter(
      (partyIndex, outcomeIndex) =>
        !(
          (fullPartySnapshot[partyIndex]?.currentHp ?? 1) <= 0 &&
          !((outcome.playerHp[outcomeIndex] ?? 0) > 0)
        ),
    );
    // The player's EXP split (min 5% each) for the members that took part.
    const expShares = sharesForSlots(
      fitExpShare(story.expShare, fullPartySnapshot.length),
      rewardPartyIndices,
    );
    const partySnapshot = session.partyIndices
      .map<PokemonProgression | null>((partyIndex, outcomeIndex) => {
        const pokemon = fullPartySnapshot[partyIndex];
        if (!pokemon || !rewardPartyIndices.includes(partyIndex)) {
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
              expShares,
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
          rewardPartyIndices,
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
          rewardPartyIndices,
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
      // Catching is worth more than defeating: the knock-out EXP plus 20% (and no EVs, nothing fainted).
      ...outcome.captures.map((caught) => ({
        species: caught.species,
        level: caught.level,
        xpRatio: CAPTURE_EXP_BONUS,
        evYield: false,
      })),
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
        1,
        expShares,
      );

    setStory((current) => {
      const next = applyPartyProgressionRewards(
        current,
        rewards,
        rewardPartyIndices,
      );

      if (outcome.captures.length === 0) {
        return next;
      }

      // The catches wait in the save until the player names each one and picks team or box.
      return outcome.captures.reduce((held, caught) => {
        const personality =
          caught.ivs && caught.nature
            ? { ivs: caught.ivs, nature: caught.nature, shiny: caught.shiny }
            : rollPersonality();
        const pokemon = createPokemonProgression(
          caught.species,
          caught.level,
          personality,
        );
        return holdCapturedPokemon(held, {
          ...pokemon,
          species: caught.species,
          status: caught.status,
          sleepTurnsRemaining: caught.sleepTurnsRemaining,
        });
      }, next);
    });

    const progressionEntries =
      progressionQueueFor(
        rewards,
        rewardPartyIndices,
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
        aria-label={t("Loading local save")}
      />
    );
  }

  const paused =
    starterChoiceOpen ||
    dexRegistrations.length > 0 ||
    pendingCaptures(story).length > 0 ||
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
      <InputBridge />
      <AutoPanel story={story} onStoryUpdate={(update) => setStory((current) => update(current))} />
      <GameMusic
        mapId={mapAudioContext.mapId}
        mapMusicId={mapAudioContext.musicId}
        battleKind={battleMusicKind}
      />

      <OverworldGame
        story={story}
        paused={paused}
        onMenuOpen={(screen) => {
          flushPlayTime();
          setMenuScreen(screen);
          setMenuOpen(true);
        }}
        respawnRequest={respawnRequest}
        onRequestStarterChoice={() => setStarterChoiceOpen(true)}
        starterFocus={
          starterChoiceOpen && !story.starter ? starterFocus : null
        }
        onStarterPointer={(kind, starter) =>
          setStarterPointer((prev) => ({
            kind,
            starter,
            nonce: (prev?.nonce ?? 0) + 1,
          }))
        }
        onMapAudioContextChange={handleMapAudioContextChange}
        onFirstBattleTrigger={(context) => {
          if (
            story.starter &&
            story.playerPokemon &&
            !story.firstBattleComplete &&
            leadMember
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
            leadMember
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
                staticId: encounter.staticId,
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
            leadMember
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
          onFocusChange={setStarterFocus}
          pointer={starterPointer}
          onClose={() => setStarterChoiceOpen(false)}
        />
      )}

      {menuOpen && (
        <StartMenu
          initialScreen={menuScreen}
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
          onFly={(destination) => {
            const id = whiteOutNonceRef.current + 1;
            whiteOutNonceRef.current = id;
            setRespawnRequest({
              id,
              mapId: destination.mapId,
              spawn: destination.spawn,
            });
            setMenuOpen(false);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {martOpen && martId && (
        <MarketWindow
          martId={martId}
          story={story}
          onStoryChange={(update) => setStory((current) => update(current))}
          onClose={() => setMartId(null)}
        />
      )}

      {storageOpen && (
        <PcWindow
          story={story}
          onStoryChange={(update) => setStory((current) => update(current))}
          onClose={() => setStorageOpen(false)}
        />
      )}

      {battleSession &&
        story.starter &&
        story.playerPokemon &&
        leadMember && (
          <FirstBattle
            starter={story.starter}
            progression={leadMember.pokemon}
            party={battleParty}
            captureAllowed={storyCanCapturePokemon(story)}
            inventory={toBattleInventory(story)}
            encounter={battleSession.encounter}
            context={battleSession.context}
            onComplete={handleBattleComplete}
            initialBattleSpeed={options.battleSpeed}
            autoPlayCatchAllowed={hasStoryPlayerEvent(story, "story", "pokedex-received")}
          />
        )}

      {pendingWhiteOut &&
        !battleResult &&
        progressionQueue.length === 0 && (
          <BlackoutOverlay
            moneyLost={pendingWhiteOut.moneyLost}
            locationLabel={
              findHealLocation(pendingWhiteOut.healLocationId)?.label ??
              "Pallet Town"
            }
            onContinue={continueAfterWhiteOut}
          />
        )}

      {!battleSession &&
        !battleResult &&
        progressionQueue.length === 0 &&
        !pendingWhiteOut &&
        pendingCaptures(story)[0] && (
          <CaptureSummary
            key={`${pendingCaptures(story)[0].species}-${pendingCaptures(story)[0].experience}-${pendingCaptures(story).length}`}
            story={story}
            pokemon={pendingCaptures(story)[0]}
            position={1}
            total={pendingCaptures(story).length}
            newEntry={!isSpeciesCaught(story, pendingCaptures(story)[0].species)}
            onResolve={(choice) => {
              const species = pendingCaptures(story)[0]?.species;
              if (species && !isSpeciesCaught(story, species)) {
                // The capture screen already announced the new entry: skip the Pokédex page.
                capturePageSpeciesRef.current.add(species);
              }
              setStory((current) => {
                const result = resolvePendingCapture(current, choice);
                return result.ok ? result.story : current;
              });
            }}
            onSendAllToBox={() => {
              for (const pending of pendingCaptures(story)) {
                if (!isSpeciesCaught(story, pending.species)) {
                  capturePageSpeciesRef.current.add(pending.species);
                }
              }
              setStory((current) => sendAllPendingToBox(current).story);
            }}
          />
        )}

      {!battleSession &&
        !battleResult &&
        progressionQueue.length === 0 &&
        !pendingWhiteOut &&
        pendingCaptures(story).length === 0 &&
        dexRegistrations[0] && (
          <PokedexRegistration
            key={dexRegistrations[0]}
            story={story}
            species={dexRegistrations[0]}
            musicVolume={options.musicMuted ? 0 : options.musicVolume}
            onDone={() => setDexRegistrations((queue) => queue.slice(1))}
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
