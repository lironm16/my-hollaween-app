import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countPresence, touchPresence } from "@/lib/presence-store";

describe("presence-store", () => {
  it("counts a touched device", () => {
    const id = `test-device-${Date.now()}`;
    assert.equal(touchPresence(id), 1);
    assert.equal(countPresence(), 1);
  });

  it("ignores short or empty device ids", () => {
    const before = countPresence();
    touchPresence("short");
    touchPresence("");
    assert.equal(countPresence(), before);
  });

  it("expires devices after TTL", () => {
    const before = countPresence();
    const id = `ttl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const realNow = Date.now;
    Date.now = () => realNow() - 4 * 60 * 1000 - 1000;
    try {
      touchPresence(id);
    } finally {
      Date.now = realNow;
    }
    assert.equal(countPresence(), before);
  });
});
