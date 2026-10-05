// @vitest-environment node
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import { StartMenu } from "../apps/client/components/StartMenu";
import { DEFAULT_GAME_OPTIONS } from "../apps/client/lib/options";
import { normalizeStoryState } from "../apps/client/lib/story";

const require = createRequire(
  new URL("../apps/client/package.json", import.meta.url),
);
const { renderToStaticMarkup } = require("react-dom/server");
const React = require("react");

describe("StartMenu", () => {
  it("renders the FireRed root entries", () => {
    const story = normalizeStoryState({
      starter: "bulbasaur",
      playerPokemon: createPokemonProgression("bulbasaur", 8),
    });
    const html = renderToStaticMarkup(
      React.createElement(StartMenu, {
        story,
        options: DEFAULT_GAME_OPTIONS,
        onStoryChange: () => {},
        onOptionsChange: () => {},
        onSave: () => "ok",
        onClose: () => {},
      }),
    );

    for (const label of [
      "POKéDEX",
      "POKéMON",
      "BAG",
      "TRAINER CARD",
      "SAVE",
      "OPTION",
      "EXIT",
    ]) {
      expect(html).toContain(label);
    }
  });
});
