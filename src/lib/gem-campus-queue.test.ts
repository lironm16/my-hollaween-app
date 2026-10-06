import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gemClusterQueueHeadline,
  gemClusterSessionMembers,
  nextClusterGemHouse,
} from "@/lib/gem-campus-queue";
import type { PublicHouse } from "@/lib/types";

function house(
  id: string,
  address: string,
  boothNumber: number,
  name: string,
): PublicHouse {
  return {
    id,
    name,
    address,
    lat: 32.093,
    lng: 34.811,
    boothNumber,
    theme: "pumpkin",
    kind: "house",
    createdAt: "2026-01-01T00:00:00.000Z",
    arrival: name,
  } as PublicHouse;
}

describe("gem cluster queue", () => {
  it("detects any multi-house cluster pin", () => {
    const school = [
      house("a", "ביה״ס ניצנים", 1, "א"),
      house("b", "ביה״ס ניצנים", 2, "ב"),
    ];
    assert.ok(gemClusterSessionMembers(school, school[0]!));

    const building = [
      house("x", "חרוזים 8, חרוזים", 1, "דירה א"),
      house("y", "חרוזים 8, חרוזים", 2, "דירה ב"),
    ];
    assert.ok(gemClusterSessionMembers(building, building[0]!));
    assert.equal(gemClusterSessionMembers([building[0]!], building[0]!), null);
  });

  it("advances by booth/unit order", () => {
    const members = [
      house("a", "ביה״ס ניצנים", 1, "א"),
      house("b", "ביה״ס ניצנים", 2, "ב"),
      house("c", "ביה״ס ניצנים", 3, "ג"),
    ];
    const collected = new Set<string>();
    const isCollected = (id: string) => collected.has(id);
    collected.add("a");
    assert.equal(nextClusterGemHouse(members, isCollected, "a")?.id, "b");
    collected.add("b");
    assert.equal(nextClusterGemHouse(members, isCollected, "b")?.id, "c");
    collected.add("c");
    assert.equal(nextClusterGemHouse(members, isCollected, "c"), null);
  });

  it("formats school and apartment headlines", () => {
    const school = [house("a", "ביה״ס ניצנים", 2, "ממתקים"), house("b", "ביה״ס ניצנים", 3, "אימה")];
    const schoolHead = gemClusterQueueHeadline(school[0]!, school);
    assert.equal(schoolHead.title, "ממתקים");
    assert.equal(schoolHead.subtitle, "דוכן 2");

    const apt = [house("x", "חרוזים 8", 4, "רוח רפאים"), house("y", "חרוזים 8", 5, "ממתקים")];
    const aptHead = gemClusterQueueHeadline(apt[0]!, apt);
    assert.equal(aptHead.title, "רוח רפאים");
    assert.equal(aptHead.subtitle, "יחידה 4");
  });
});
