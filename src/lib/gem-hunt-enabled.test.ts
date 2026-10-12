import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gemHuntResidentialHousesEnabled } from "@/lib/gem-hunt-enabled";

async function withGemHuntEnv(value: string | undefined, fn: () => Promise<void> | void) {
  const prev = process.env.NEXT_PUBLIC_GEM_HUNT;
  if (value === undefined) delete process.env.NEXT_PUBLIC_GEM_HUNT;
  else process.env.NEXT_PUBLIC_GEM_HUNT = value;
  try {
    await fn();
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_GEM_HUNT;
    else process.env.NEXT_PUBLIC_GEM_HUNT = prev;
  }
}

describe("gem hunt enabled", () => {
  it("keeps residential gems off until event time", () => {
    assert.equal(gemHuntResidentialHousesEnabled(), false);
  });

  it("defaults gem hunt UI to admin-only", async () => {
    await withGemHuntEnv(undefined, async () => {
      const { gemHuntVisible, gemHuntPublicEnvEnabled } = await import("@/lib/gem-hunt-enabled");
      assert.equal(gemHuntPublicEnvEnabled(), false);
      assert.equal(gemHuntVisible(false), false);
      assert.equal(gemHuntVisible(true), true);
    });
  });

  it("opens gem hunt UI for everyone when NEXT_PUBLIC_GEM_HUNT=1", async () => {
    await withGemHuntEnv("1", async () => {
      const { gemHuntVisible, gemMapLegendVisible } = await import("@/lib/gem-hunt-enabled");
      assert.equal(gemHuntVisible(false), true);
      assert.equal(gemMapLegendVisible(false), true);
    });
  });
});
