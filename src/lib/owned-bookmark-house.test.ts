import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseFromOwnedBookmark } from "@/lib/owned-bookmark-house";
import type { PublicHouse } from "@/lib/types";
import type { OwnedHouse } from "@/lib/offline-db";

function row(id: string, address: string, updatedAt: string): PublicHouse {
  return { id, name: id, address, lat: 32, lng: 34, updatedAt } as PublicHouse;
}

describe("houseFromOwnedBookmark", () => {
  it("prefers catalog when preview address is stale", () => {
    const item: OwnedHouse = {
      id: "h1",
      name: "בית",
      editCode: "abc",
      preview: row("h1", "רחוב ישן 1", "2026-10-31T10:00:00.000Z"),
    };
    const catalog = row("h1", "רחוב חדש 8", "2026-10-31T12:00:00.000Z");
    const merged = houseFromOwnedBookmark(item, catalog);
    assert.equal(merged?.address, "רחוב חדש 8");
  });

  it("merges preview when it is newer than catalog", () => {
    const item: OwnedHouse = {
      id: "h1",
      name: "בית",
      editCode: "abc",
      preview: row("h1", "טיוטה מקומית", "2026-10-31T14:00:00.000Z"),
    };
    const catalog = row("h1", "רחוב מהשרת", "2026-10-31T12:00:00.000Z");
    const merged = houseFromOwnedBookmark(item, catalog);
    assert.equal(merged?.address, "טיוטה מקומית");
  });
});
