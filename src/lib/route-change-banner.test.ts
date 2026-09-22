import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { routeChangeBannerMessage } from "@/components/route-change-banner";
import type { RouteStatusChangeEntry } from "@/lib/route-changes";
import type { PublicHouse } from "@/lib/types";

function entry(id: string, reason: string): RouteStatusChangeEntry {
  const house = { id, name: id } as PublicHouse;
  return { houseId: id, name: id, reason, house };
}

describe("routeChangeBannerMessage", () => {
  it("summarizes a single change", () => {
    assert.equal(routeChangeBannerMessage([entry("a", "חזר לפתוח")]), "a — חזר לפתוח");
  });

  it("summarizes multiple changes", () => {
    assert.equal(
      routeChangeBannerMessage([entry("a", "חזר לפתוח"), entry("b", "נסגר")]),
      "2 בתים במסלול השתנו · הקישו לפרטים",
    );
  });
});
