"use client";

import { useEffect, useState } from "react";
import type { StarterSpeciesId } from "@tactimon/battle-engine";
import { FirstBattle } from "@/components/FirstBattle";
import { OverworldGame } from "@/components/OverworldGame";
import { StarterChoice } from "@/components/StarterChoice";
import {
  chooseStarter,
  DEFAULT_STORY_STATE,
  type StoryState,
} from "@/lib/story";

const STORAGE_KEY = "tactimon.story.v1";

export function GameClient() {
  const [story, setStory] = useState<StoryState>(
    DEFAULT_STORY_STATE,
  );
  const [starterChoiceOpen, setStarterChoiceOpen] =
    useState(false);
  const [battleActive, setBattleActive] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setStory(JSON.parse(stored) as StoryState);
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

  const handleChooseStarter = (
    starter: StarterSpeciesId,
  ) => {
    setStory(chooseStarter(starter));
    setStarterChoiceOpen(false);
  };

  const handleBattleComplete = () => {
    setStory((current) => ({
      ...current,
      firstBattleComplete: true,
    }));
    setBattleActive(false);
  };

  return (
    <div className="game-client">
      <OverworldGame
        story={story}
        paused={starterChoiceOpen || battleActive}
        onRequestStarterChoice={() => setStarterChoiceOpen(true)}
        onFirstBattleTrigger={() => {
          if (story.starter && !story.firstBattleComplete) {
            setBattleActive(true);
          }
        }}
      />

      {starterChoiceOpen && !story.starter && (
        <StarterChoice
          onChoose={handleChooseStarter}
          onClose={() => setStarterChoiceOpen(false)}
        />
      )}

      {battleActive && story.starter && (
        <FirstBattle
          starter={story.starter}
          onComplete={handleBattleComplete}
        />
      )}
    </div>
  );
}
