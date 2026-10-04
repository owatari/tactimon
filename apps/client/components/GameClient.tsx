"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createPokemonProgression,
  grantTrainerBattleProgressToParty,
  grantWildBattleProgressToParty,
  type DuelPokemonBuild,
  type PokemonProgression,
  type ProgressionReward,
  type StarterSpeciesId,
} from "@tactimon/battle-engine";
import type { BattleSceneContext } from "@/lib/maps";
import {
  FirstBattle,
  type BattleEncounter,
  type BattleOutcome,
} from "@/components/FirstBattle";
import { GameMusic } from "@/components/GameMusic";
import { OverworldGame } from "@/components/OverworldGame";
import { ProgressionOverlay } from "@/components/ProgressionOverlay";
import { StarterChoice } from "@/components/StarterChoice";
import {
  chooseStarter,
  DEFAULT_STORY_STATE,
  normalizeStoryState,
  type StoryState,
} from "@/lib/story";

const STORAGE_KEY = "tactimon.story.v1";

type BattleSession = {
  context: BattleSceneContext;
  encounter: BattleEncounter;
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
): StoryState {
  const nextStarter =
    rewards[0]?.progression ??
    current.playerPokemon;
  const nextCaptured = current.capturedPokemon.map(
    (pokemon, index) => {
      const reward = rewards[index + 1];
      if (!reward) {
        return pokemon;
      }

      return {
        ...reward.progression,
        species: pokemon.species,
      };
    },
  );

  return {
    ...current,
    playerPokemon: nextStarter,
    capturedPokemon: nextCaptured.slice(0, 5),
  };
}

function progressionQueueFor(
  rewards: readonly ProgressionReward[],
): ProgressionQueueEntry[] {
  const visible = rewards
    .map((reward, partyIndex) => ({
      partyIndex,
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
  const [battleSession, setBattleSession] =
    useState<BattleSession | null>(null);
  const [progressionQueue, setProgressionQueue] =
    useState<ProgressionQueueEntry[]>([]);
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

  const battleParty = useMemo<DuelPokemonBuild[]>(
    () =>
      partyProgressions.map((pokemon) => ({
        species: pokemon.species,
        level: pokemon.level,
        moves: [...pokemon.activeMoves],
        evs: pokemon.evs,
      })),
    [partyProgressions],
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

    const partySnapshot = story.playerPokemon
      ? [
          story.playerPokemon,
          ...story.capturedPokemon,
        ].slice(0, 6)
      : [];

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

      setStory((current) => {
        let next = applyPartyProgressionRewards(
          current,
          rewards,
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
          return next;
        }

        return {
          ...next,
          firstBattleComplete: true,
        };
      });

      setProgressionQueue(
        progressionQueueFor(rewards),
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
      );

      if (
        !outcome.capture?.success ||
        next.capturedPokemon.length >= 5
      ) {
        return next;
      }

      return {
        ...next,
        capturedPokemon: [
          ...next.capturedPokemon,
          createPokemonProgression(
            outcome.capture.species,
            outcome.capture.level,
          ),
        ].slice(0, 5),
      };
    });

    setProgressionQueue(
      progressionQueueFor(rewards),
    );
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
    Boolean(battleSession) ||
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
        onRequestStarterChoice={() => setStarterChoiceOpen(true)}
        onMapAudioContextChange={handleMapAudioContextChange}
        onFirstBattleTrigger={(context) => {
          if (
            story.starter &&
            story.playerPokemon &&
            !story.firstBattleComplete
          ) {
            setBattleSession({
              context,
              encounter: { kind: "trainer" },
            });
          }
        }}
        onWildBattleTrigger={(context, encounter) => {
          if (
            story.starter &&
            story.playerPokemon &&
            story.firstBattleComplete
          ) {
            setBattleSession({
              context,
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
            !story.defeatedTrainerIds.includes(trainer.id)
          ) {
            setBattleSession({
              context,
              encounter: {
                kind: "trainer",
                trainerId: trainer.id,
                trainerName: trainer.name,
                rivals: trainer.party,
              },
            });
          }
        }}
      />

      {starterChoiceOpen && !story.starter && (
        <StarterChoice
          onChoose={handleChooseStarter}
          onClose={() => setStarterChoiceOpen(false)}
        />
      )}

      {battleSession &&
        story.starter &&
        story.playerPokemon && (
          <FirstBattle
            starter={story.starter}
            progression={story.playerPokemon}
            party={battleParty}
            encounter={battleSession.encounter}
            context={battleSession.context}
            onComplete={handleBattleComplete}
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
