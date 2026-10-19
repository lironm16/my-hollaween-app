import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countOwnerSessions,
  normalizeHouseAccessRole,
  sessionIsOwner,
} from "@/lib/house-access-role";
import type { HouseAccessSession } from "@/lib/night-pass-store";

function session(role?: "owner" | "editor"): HouseAccessSession {
  return {
    sessionId: "s1",
    tokenHash: "h",
    registeredAt: "2026-01-01T00:00:00.000Z",
    holderName: "A",
    holderPhone: "0501234567",
    role,
  };
}

describe("house-access-role", () => {
  it("defaults missing role to owner (pre-roles sessions)", () => {
    assert.equal(normalizeHouseAccessRole(undefined), "owner");
    assert.equal(normalizeHouseAccessRole("editor"), "editor");
    assert.equal(normalizeHouseAccessRole("owner"), "owner");
  });

  it("counts owners", () => {
    assert.equal(countOwnerSessions([session("editor"), session("owner")]), 1);
  });

  it("sessionIsOwner", () => {
    assert.equal(sessionIsOwner(session("owner")), true);
    assert.equal(sessionIsOwner(session("editor")), false);
    assert.equal(sessionIsOwner(session()), true);
  });
});
