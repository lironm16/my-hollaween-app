import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fitFontSize,
  visitPosterHouseName,
  visitPosterPath,
  VISIT_POSTER_LAYOUT,
} from "@/lib/visit-poster";
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

describe("VISIT_POSTER_LAYOUT", () => {
  it("centers name inside square card above the QR frame", () => {
    const { name, qr } = VISIT_POSTER_LAYOUT;
    // Name box should be horizontally centered around 50%
    const nameCenter = name.left + name.width / 2;
    assert.ok(Math.abs(nameCenter - 50) < 1, `name center ${nameCenter} should be ~50%`);
    // Name box bottom should be strictly above QR top
    assert.ok(name.top + name.height < qr.top, `name bottom should be above QR top`);
  });
});
