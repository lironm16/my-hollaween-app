import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseVisitQrPrintDocumentHtml } from "@/lib/house-visit-qr-print";

describe("houseVisitQrPrintDocumentHtml", () => {
  it("includes house name, scan copy, and half-A4 QR sizing", () => {
    const html = houseVisitQrPrintDocumentHtml({
      houseName: "משפחת כהן",
      dataUrl: "data:image/png;base64,abc",
    });
    assert.match(html, /משפחת כהן/);
    assert.match(html, /סרקו לביקור/);
    assert.match(html, /Scan to visit/);
    assert.match(html, /105mm/);
    assert.match(html, /size: A4/);
    assert.doesNotMatch(html, /https:\/\//);
  });

  it("escapes HTML in house name", () => {
    const html = houseVisitQrPrintDocumentHtml({
      houseName: "<script>",
      dataUrl: "data:image/png;base64,x",
    });
    assert.match(html, /<h1 class="house-name">&lt;script&gt;<\/h1>/);
  });
});
