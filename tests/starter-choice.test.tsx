// @vitest-environment node
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { StarterChoice } from "../apps/client/components/StarterChoice";
import {
  INITIAL_STARTER_CHOICE,
  pointStarterChoice,
  stepStarterChoice,
} from "../apps/client/lib/starterChoice";

const require = createRequire(
  new URL("../apps/client/package.json", import.meta.url),
);
const { renderToStaticMarkup } = require("react-dom/server");
const React = require("react");

describe("starter choice (Oak's table)", () => {
  it("cycles balls, asks for confirmation and only picks on YES", () => {
    let r = stepStarterChoice(INITIAL_STARTER_CHOICE, "right");
    expect(r.state.index).toBe(1);
    r = stepStarterChoice(r.state, "right");
    r = stepStarterChoice(r.state, "right");
    expect(r.state.index).toBe(0); // wraps
    r = stepStarterChoice(stepStarterChoice(r.state, "left").state, "confirm");
    expect(r.state.stage).toBe("confirm");
    expect(r.chosen).toBeUndefined();
    const yes = stepStarterChoice(r.state, "confirm");
    expect(yes.chosen).toBe("squirtle"); // table order: Bulbasaur, Charmander, Squirtle
  });

  it("NO or back returns to the ball choice; back on the table closes", () => {
    const confirm = stepStarterChoice(INITIAL_STARTER_CHOICE, "confirm").state;
    const no = stepStarterChoice(stepStarterChoice(confirm, "down").state, "confirm");
    expect(no.state.stage).toBe("pick");
    expect(no.chosen).toBeUndefined();
    expect(stepStarterChoice(confirm, "back").state.stage).toBe("pick");
    expect(stepStarterChoice(INITIAL_STARTER_CHOICE, "back").close).toBe(true);
  });

  it("hovering a real ball moves the cursor and clicking asks for confirmation", () => {
    const hover = pointStarterChoice(INITIAL_STARTER_CHOICE, "charmander", false);
    expect(hover).toMatchObject({ index: 1, stage: "pick" });
    const click = pointStarterChoice(hover, "squirtle", true);
    expect(click).toMatchObject({ index: 2, stage: "confirm", answer: 0 });
    // Pointer input is ignored while the YES/NO prompt is open.
    expect(pointStarterChoice(click, "bulbasaur", false)).toBe(click);
  });

  it("renders the info window, pager and FireRed text box over the real lab (no table/cards)", () => {
    const html = renderToStaticMarkup(
      React.createElement(StarterChoice, { onChoose: () => {}, onClose: () => {} }),
    );
    expect(html).not.toContain("starter-table");
    expect(html).toContain("BULBASAUR");
    expect(html).toContain("starter-textbox");
    expect(html).not.toContain("starter-card");
  });
});
