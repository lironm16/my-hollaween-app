import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  lobbyOrEntranceMentionSnippet,
  textMentionsElevator,
  textMentionsLobbyOrMainEntrance,
} from "@/lib/house-anomaly-accessible-text";

describe("house-anomaly-accessible-text", () => {
  it("detects lobby and entrance phrasing", () => {
    assert.equal(textMentionsLobbyOrMainEntrance("Meet in the building lobby"), true);
    assert.equal(textMentionsLobbyOrMainEntrance("Lobby entrance, ground floor"), true);
    assert.equal(textMentionsLobbyOrMainEntrance("נפגשים בלובי הבניין"), true);
    assert.equal(textMentionsLobbyOrMainEntrance("", "כניסה ראשית — צלצלו"), true);
    assert.equal(textMentionsLobbyOrMainEntrance("Side entrance by the garden"), true);
  });

  it("ignores ordinary apartment arrival lines", () => {
    assert.equal(textMentionsLobbyOrMainEntrance("קומה 2, דירה 5, כניסה מהחצר"), false);
    assert.equal(textMentionsLobbyOrMainEntrance("דלת כניסה עם דלעת"), false);
  });

  it("returns the matching field snippet", () => {
    assert.equal(
      lobbyOrEntranceMentionSnippet({ arrival: "Lobby entrance on HaGefen" }),
      "Lobby entrance on HaGefen",
    );
  });

  it("detects elevator mentions but not negated lines", () => {
    assert.equal(textMentionsElevator("קומה 5, מעלית ואז שמאלה"), true);
    assert.equal(textMentionsElevator("Take the elevator to floor 3"), true);
    assert.equal(textMentionsElevator("אין מעלית"), false);
    assert.equal(textMentionsElevator("אין מעלית — רק מדרגות"), false);
    assert.equal(textMentionsElevator("מעלית לא עובדת, עולים במדרגות"), false);
    assert.equal(textMentionsElevator("המעלית לא תקינה"), false);
    assert.equal(textMentionsElevator("No elevator, stairs only"), false);
    assert.equal(textMentionsElevator("Elevator not working — use stairs"), false);
  });
});
