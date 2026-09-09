import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  anyPushTopicOn,
  normalizePushTopics,
  subscriptionAllowsTopic,
  topicForKind,
  topicsFromPrefs,
} from "@/lib/push-topics";

describe("push-topics", () => {
  it("topicsFromPrefs returns only enabled topics", () => {
    assert.deepEqual(
      topicsFromPrefs({ newHouse: true, houseStatus: false, admin: true }),
      ["newHouse", "admin"],
    );
  });

  it("anyPushTopicOn is false when everything is off", () => {
    assert.equal(
      anyPushTopicOn({ newHouse: false, houseStatus: false, admin: false }),
      false,
    );
  });

  it("normalizePushTopics ignores unknown values", () => {
    assert.deepEqual(normalizePushTopics(["newHouse", "bogus", "admin"]), ["newHouse", "admin"]);
  });

  it("topicForKind maps houseAdded to newHouse", () => {
    assert.equal(topicForKind("houseAdded"), "newHouse");
    assert.equal(topicForKind("candyLow"), "houseStatus");
  });

  it("subscriptionAllowsTopic defaults to true for legacy records", () => {
    assert.equal(subscriptionAllowsTopic({}, "admin"), true);
    assert.equal(subscriptionAllowsTopic({ topics: [] }, "admin"), true);
    assert.equal(subscriptionAllowsTopic({ topics: ["newHouse"] }, "admin"), false);
  });
});
