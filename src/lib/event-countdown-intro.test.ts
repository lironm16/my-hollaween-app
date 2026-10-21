import assert from "node:assert/strict";
import test from "node:test";
import {
  EVENT_COUNTDOWN_INTRO_SEEN_KEY,
  markEventCountdownIntroSeen,
  readEventCountdownIntroSeen,
} from "@/lib/event-countdown-intro";

test("event countdown intro seen flag", () => {
  const store = new Map<string, string>();
  const g = globalThis as { localStorage?: Storage; window?: unknown };
  g.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  };
  g.window = globalThis;

  assert.equal(readEventCountdownIntroSeen(), false);
  markEventCountdownIntroSeen();
  assert.equal(store.get(EVENT_COUNTDOWN_INTRO_SEEN_KEY), "1");
  assert.equal(readEventCountdownIntroSeen(), true);

  delete g.localStorage;
  delete g.window;
});
