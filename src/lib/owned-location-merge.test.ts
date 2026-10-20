import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeOwnedLocationFields } from "@/lib/owned-location-merge";
import type { PublicHouse } from "@/lib/types";

function row(address: string, updatedAt: string): PublicHouse {
  return { id: "h1", name: "בית", address, lat: 32, lng: 34, updatedAt } as PublicHouse;
}

describe("mergeOwnedLocationFields", () => {
  it("preserves local street when remote catalog row is newer and empty", () => {
    const merged = mergeOwnedLocationFields(
      row("רחוב 8", "2026-10-31T10:00:00.000Z"),
      row("", "2026-10-31T14:00:00.000Z"),
    );
    assert.equal(merged.address, "רחוב 8");
  });

  it("takes remote street when remote is newer and has address", () => {
    const merged = mergeOwnedLocationFields(
      row("ישן", "2026-10-31T10:00:00.000Z"),
      row("חדש", "2026-10-31T14:00:00.000Z"),
    );
    assert.equal(merged.address, "חדש");
  });
});
