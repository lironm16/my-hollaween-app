import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fetchPublicHouseSession,
  houseNeedsSessionHydration,
  readSessionHouseDetail,
  rememberSessionHouseDetail,
} from "@/lib/house-detail-session-cache";
import type { PublicHouse } from "@/lib/types";

function pin(id: string): PublicHouse {
  return {
    id,
    name: id,
    address: "",
    lat: 32,
    lng: 34,
    deviceCachePin: true,
  } as PublicHouse;
}

function full(id: string): PublicHouse {
  return {
    id,
    name: id,
    address: "רחוב 1",
    lat: 32,
    lng: 34,
  } as PublicHouse;
}

describe("house-detail-session-cache", () => {
  it("remembers hydrated rows for the session", () => {
    rememberSessionHouseDetail(full("בית-1"));
    assert.equal(readSessionHouseDetail("בית-1")?.address, "רחוב 1");
    assert.equal(houseNeedsSessionHydration(pin("בית-1")), false);
  });

  it("dedupes concurrent fetches by id", async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls += 1;
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      assert.match(url, /\/api\/houses\//);
      return new Response(JSON.stringify(full("בית-2")), { status: 200 });
    }) as typeof fetch;
    try {
      const [a, b] = await Promise.all([
        fetchPublicHouseSession("בית-2"),
        fetchPublicHouseSession("בית-2"),
      ]);
      assert.equal(calls, 1);
      assert.equal(a.ok && b.ok && a.house.id, "בית-2");
    } finally {
      globalThis.fetch = original;
    }
  });
});
