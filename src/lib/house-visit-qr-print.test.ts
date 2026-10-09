import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  houseVisitQrPrintDocumentForHouse,
  houseVisitQrPrintDocumentHtml,
  visitQrPosterBoothLabel,
} from "@/lib/house-visit-qr-print";
import type { PublicHouse } from "@/lib/types";

describe("houseVisitQrPrintDocumentHtml", () => {
  it("includes Halloween layout, Rubik styling, Scan me for visit text, and printer-friendly background", () => {
    const html = houseVisitQrPrintDocumentHtml({
      houseName: "🎃 בית משפחת כהן",
      dataUrl: "data:image/png;base64,abc",
      boothLabel: "דוכן 3",
    });
    assert.match(html, /בית משפחת כהן/);
    assert.match(html, /דוכן 3/);
    assert.match(html, /סרקו אותי לביקור!/);
    assert.match(html, /Scan me for visit/);
    assert.match(html, /fonts\.googleapis\.com.*Rubik/);
    assert.match(html, /font-family: Rubik/);
    assert.match(html, /background: #ffffff;/);
    assert.match(html, /size: A4/);
  });

  it("escapes HTML in house name", () => {
    const html = houseVisitQrPrintDocumentHtml({
      houseName: "<script>",
      dataUrl: "data:image/png;base64,x",
    });
    assert.match(html, /<h1 class="house-name">&lt;script&gt;<\/h1>/);
  });
});

describe("visitQrPosterBoothLabel", () => {
  it("shows דוכן for school campus by address", () => {
    const house = {
      name: "כיתה א׳",
      address: "ביה״ס ניצנים",
      boothNumber: 2,
    } as PublicHouse;
    assert.equal(visitQrPosterBoothLabel(house), "דוכן 2");
  });

  it("shows דוכן for catalog school name when address is empty", () => {
    const house = {
      name: "🎃 ניצנים — כיתה א׳",
      address: "",
      boothNumber: 1,
      isStub: true,
    } as PublicHouse;
    assert.equal(visitQrPosterBoothLabel(house), "דוכן חזרה 1");
  });
});

describe("houseVisitQrPrintDocumentForHouse", () => {
  it("uses real catalog house headline", () => {
    const house = {
      name: "בית משפחת כהן",
      theme: "pumpkin",
      visit: "come",
      boothNumber: null,
      address: "",
    } as PublicHouse;
    const html = houseVisitQrPrintDocumentForHouse({ house, dataUrl: "data:image/png;base64,x" });
    assert.match(html, /🎃 בית משפחת כהן/);
  });
});
