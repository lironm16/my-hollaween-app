import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  exportFilename,
  exportHouseCountMessage,
  housesToCsv,
  housesToExportTxt,
} from "@/lib/house-csv";
import type { PublicHouse } from "@/lib/types";

function house(patch: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id: "בית-1",
    name: "בית בדיקה",
    theme: "pumpkin",
    address: "חרוזים 8",
    arrival: "קומה 2",
    description: "קישוטים",
    lat: 32.0916,
    lng: 34.8028,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    openHours: [{ from: "17:00", to: "21:00" }],
    notes: "כלב קטן",
    accessible: true,
    visit: "come",
    decorLevel: "mild",
    decorated: true,
    soldOut: false,
    createdAt: "2026-10-31T12:00:00.000Z",
    updatedAt: "2026-10-31T12:00:00.000Z",
    adminFrozen: false,
    ...patch,
  } as PublicHouse;
}

describe("housesToCsv", () => {
  it("prefixes UTF-8 BOM and Hebrew headers", () => {
    const csv = housesToCsv([house()]);
    assert.match(csv, /^\uFEFFמס'/);
    assert.ok(csv.includes("שם"));
    assert.ok(csv.includes("ממתקים"));
    assert.ok(csv.includes("ללא גלוטן"));
  });

  it("includes one data row per house with candy and scare labels", () => {
    const csv = housesToCsv([house(), house({ id: "בית-2", name: "בית שני", treatStock: { candy: "low" } })]);
    const lines = csv.trim().split(/\r?\n/);
    assert.equal(lines.length, 3);
    assert.ok(csv.includes("בית בדיקה"));
    assert.ok(csv.includes("יש"));
    assert.ok(csv.includes("מעט"));
    assert.ok(csv.includes("לילדים"));
  });

  it("returns header only for an empty list", () => {
    const csv = housesToCsv([]);
    const lines = csv.trim().split(/\r?\n/);
    assert.equal(lines.length, 1);
  });
});

describe("house export helpers", () => {
  it("builds filenames per format", () => {
    assert.match(exportFilename("list", "xlsx"), /\.xlsx$/);
    assert.match(exportFilename("list", "csv"), /\.csv$/);
    assert.match(exportFilename("list", "txt"), /\.txt$/);
  });

  it("explains filtered export counts", () => {
    assert.match(exportHouseCountMessage(3, 10, 2), /3.*10/);
    assert.match(exportHouseCountMessage(5, 5, 0), /כל 5/);
    assert.match(exportHouseCountMessage(0, 5, 1), /אין בתים/);
  });

  it("serializes houses as plain text list", () => {
    const txt = housesToExportTxt([house()]);
    assert.ok(txt.includes("בית בדיקה"));
    assert.ok(txt.includes("חרוזים"));
    assert.match(txt, /^1\./m);
  });
});
