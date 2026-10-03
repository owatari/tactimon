"use client";

import { useCallback, useEffect, useState } from "react";
import {
  grantWildBattleProgress,
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

export function GameClient() {
  const [story, setStory] = useState<StoryState>(
    DEFAULT_STORY_STATE,
  );
  const [starterChoiceOpen, setStarterChoiceOpen] =
    useState(false);
  const [battleSession, setBattleSession] =
    useState<BattleSession | null>(null);
  const [progressionReward, setProgressionReward] =
    useState<ProgressionReward | null>(null);
  const [mapAudioContext, setMapAudioContext] = useState<{
    mapId: string;
    musicId: number | null;
  }>({
    mapId: "pallet-town",
    musicId: 300,
  });

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

    if (session.encounter.kind === "trainer") {
      setStory((current) => ({
        ...current,
        firstBattleComplete: true,
      }));
      return;
    }

    if (
      !outcome.won ||
      outcome.escaped ||
      !story.playerPokemon
    ) {
      return;
    }

    const reward = grantWildBattleProgress(
      story.playerPokemon,
      {
        species: session.encounter.species,
        level: session.encounter.level,
      },
    );

    setStory((current) => ({
      ...current,
      playerPokemon: reward.progression,
    }));
    setProgressionReward(reward);
  };

  const finishProgression = (
    progression: PokemonProgression,
  ) => {
    setStory((current) => ({
      ...current,
      playerPokemon: progression,
    }));
    setProgressionReward(null);
  };

  const paused =
    starterChoiceOpen ||
    Boolean(battleSession) ||
    Boolean(progressionReward);
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
            encounter={battleSession.encounter}
            context={battleSession.context}
            onComplete={handleBattleComplete}
          />
        )}

      {progressionReward && (
        <ProgressionOverlay
          reward={progressionReward}
          onComplete={finishProgression}
        />
      )}
    </div>
  );
}
