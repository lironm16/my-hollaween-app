import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fitFontSize, visitPosterHouseName, visitPosterPath } from "@/lib/visit-poster";
import type { PublicHouse } from "@/lib/types";

describe("visitPosterPath", () => {
  it("nests under the house share path", () => {
    assert.equal(visitPosterPath({ id: "בית-8859" } as PublicHouse), "/house/8859/poster");
  });
});

describe("visitPosterHouseName", () => {
  it("uses the plain house name without booth labels", () => {
    assert.equal(visitPosterHouseName({ name: "  בית משפחת כהן " }), "בית משפחת כהן");
  });

  it("glues a dash to the preceding word", () => {
    assert.equal(visitPosterHouseName({ name: "🎃 ניצנים — כיתה א׳" }), "🎃 ניצנים\u00a0— כיתה א׳");
  });
});

describe("fitFontSize", () => {
  it("returns max when everything fits", () => {
    assert.equal(fitFontSize({ min: 10, max: 100, fits: () => true }), 100);
  });

  it("shrinks longer text to a smaller size", () => {
    const boxWidth = 400;
    const sizeFor = (chars: number) =>
      fitFontSize({ min: 8, max: 200, fits: (size) => size * 0.6 * chars <= boxWidth });
    const short = sizeFor(8);
    const long = sizeFor(40);
    assert.ok(short > long);
    assert.ok(long * 0.6 * 40 <= boxWidth);
  });

  it("falls back to min when nothing fits", () => {
    assert.equal(fitFontSize({ min: 12, max: 90, fits: () => false }), 12);
  });
});
