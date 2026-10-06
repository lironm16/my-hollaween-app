import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  campusGemBoothHeadline,
  gemCampusSessionMembers,
  nextCampusGemHouse,
} from "@/lib/gem-campus-queue";
import type { PublicHouse } from "@/lib/types";

function booth(id: string, boothNumber: number, name: string): PublicHouse {
  return {
    id,
    name,
    address: "ביה״ס ניצנים",
    lat: 32.093,
    lng: 34.811,
    boothNumber,
    theme: "pumpkin",
    kind: "house",
    createdAt: "2026-01-01T00:00:00.000Z",
    arrival: name,
  } as PublicHouse;
}

describe("gem campus queue", () => {
  it("detects multi-booth school campus", () => {
    const map = [booth("a", 1, "א"), booth("b", 2, "ב")];
    assert.ok(gemCampusSessionMembers(map, map[0]!));
    assert.equal(gemCampusSessionMembers([booth("a", 1, "א")], map[0]!), null);
  });

  it("advances by booth order", () => {
    const members = [booth("a", 1, "א"), booth("b", 2, "ב"), booth("c", 3, "ג")];
    const collected = new Set<string>();
    const isCollected = (id: string) => collected.has(id);
    collected.add("a");
    assert.equal(nextCampusGemHouse(members, isCollected, "a")?.id, "b");
    collected.add("b");
    assert.equal(nextCampusGemHouse(members, isCollected, "b")?.id, "c");
    collected.add("c");
    assert.equal(nextCampusGemHouse(members, isCollected, "c"), null);
  });

  it("formats booth headline", () => {
    const members = [booth("a", 2, "ממתקים"), booth("b", 3, "אימה")];
    const { title, subtitle } = campusGemBoothHeadline(members[0]!, members);
    assert.equal(title, "ממתקים");
    assert.equal(subtitle, "דוכן 2");
  });
});
