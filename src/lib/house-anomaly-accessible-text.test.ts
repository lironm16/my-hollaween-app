import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  lobbyOrEntranceMentionSnippet,
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
});
