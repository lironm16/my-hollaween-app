import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { googlePointSearchHits } from "@/lib/event-boundary-search.server";

describe("event boundary google search", () => {
  it("returns no rows when GOOGLE_MAPS_API_KEY is unset", async () => {
    const prev = process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    try {
      const hits = await googlePointSearchHits("ניצנים", 6);
      assert.deepEqual(hits, []);
    } finally {
      if (prev !== undefined) process.env.GOOGLE_MAPS_API_KEY = prev;
    }
  });
});
