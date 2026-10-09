import { clusterBoothLabel } from "@/lib/cluster-booth";
import { houseHeadline } from "@/lib/labels";
import { NAMED_ADDRESS_PLACES } from "@/lib/named-address-places";
import { clusterIsSchoolCampus, isSchoolCampusAddress } from "@/lib/school-campus";
import type { PublicHouse } from "@/lib/types";

/** QR pixel size for print (~105mm at 300dpi — half A4 width). */
export const HOUSE_VISIT_QR_PRINT_PX = 1240;

const GOOGLE_FONTS_RUBIK =
  "https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;800&display=swap";

export function escapeVisitQrPrintHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** School booth line for the door poster — matches in-app «דוכן N» when at a campus. */
export function visitQrPosterBoothLabel(
  house: Pick<PublicHouse, "boothNumber" | "address" | "name" | "isStub" | "isPractice">,
): string | null {
  const address = house.address?.trim() ?? "";
  if (address && clusterIsSchoolCampus([{ address }])) {
    return clusterBoothLabel(house, [{ address }]);
  }
  const name = house.name ?? "";
  for (const place of NAMED_ADDRESS_PLACES) {
    const tokens = [place.displayName, ...place.aliases];
    if (tokens.some((token) => token && name.includes(token.replace(/"/g, "")))) {
      return clusterBoothLabel(house, [{ address: place.displayName }]);
    }
  }
  if (isSchoolCampusAddress(address)) {
    return clusterBoothLabel(house, [{ address }]);
  }
  return null;
}

export function visitQrPosterHouseTitle(house: Pick<PublicHouse, "name" | "theme" | "soldOut" | "visit">) {
  return houseHeadline(house);
}

export function houseVisitQrPrintDocumentHtml(options: {
  houseName: string;
  dataUrl: string;
  boothLabel?: string | null;
  url?: string;
}) {
  const houseName = escapeVisitQrPrintHtml(options.houseName);
  const dataUrl = escapeVisitQrPrintHtml(options.dataUrl);
  const boothLabel = options.boothLabel?.trim();
  const boothBlock = boothLabel
    ? `<p class="booth-badge">${escapeVisitQrPrintHtml(boothLabel)}</p>`
    : "";
  const urlBlock = options.url
    ? `<p class="url">${escapeVisitQrPrintHtml(options.url)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>QR ביקור — ${houseName}</title>
  <link rel="stylesheet" href="${GOOGLE_FONTS_RUBIK}" />
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body {
      font-family: Rubik, "Segoe UI", Tahoma, sans-serif;
      color: #f4e7c8;
      background: #12081a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      position: relative;
      min-height: 297mm;
      width: 210mm;
      margin: 0 auto;
      padding: 14mm 12mm 16mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 7mm;
      text-align: center;
      overflow: hidden;
      background:
        radial-gradient(ellipse 120% 80% at 50% -10%, rgba(249, 115, 22, 0.35), transparent 55%),
        radial-gradient(circle at 12% 88%, rgba(168, 85, 247, 0.22), transparent 45%),
        radial-gradient(circle at 88% 78%, rgba(234, 88, 12, 0.18), transparent 40%),
        linear-gradient(165deg, #1a0a2e 0%, #12081a 45%, #0f0618 100%);
      border: 4mm solid transparent;
      border-image: linear-gradient(135deg, #f97316, #a855f7, #f97316) 1;
      box-shadow: inset 0 0 80px rgba(249, 115, 22, 0.08);
    }
    .sheet::before,
    .sheet::after {
      position: absolute;
      font-size: 22pt;
      opacity: 0.35;
      pointer-events: none;
    }
    .sheet::before { content: "🎃"; top: 10mm; right: 12mm; transform: rotate(12deg); }
    .sheet::after { content: "👻"; bottom: 12mm; left: 14mm; transform: rotate(-8deg); }
    .brand {
      font-size: 11pt;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: rgba(251, 191, 36, 0.9);
      margin: 0;
      text-transform: none;
    }
    .house-name {
      font-size: 32pt;
      font-weight: 800;
      line-height: 1.15;
      max-width: 175mm;
      margin: 0;
      color: #fff7ed;
      text-shadow: 0 2px 0 rgba(0,0,0,0.25), 0 0 28px rgba(249, 115, 22, 0.35);
    }
    .booth-badge {
      display: inline-block;
      margin: 0;
      padding: 3mm 7mm;
      border-radius: 999px;
      font-size: 16pt;
      font-weight: 800;
      color: #1a0a2e;
      background: linear-gradient(180deg, #fdba74, #f97316);
      box-shadow: 0 4px 0 rgba(0,0,0,0.2), 0 0 24px rgba(249, 115, 22, 0.45);
    }
    .scan-cheer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2mm;
      margin: 2mm 0 0;
      padding: 5mm 10mm 4mm;
      border-radius: 6mm;
      background: #059669;
      color: #fff;
      box-shadow: 0 0 0 3px rgba(255,255,255,0.15), 0 10px 32px rgba(5, 150, 105, 0.55);
    }
    .scan-he {
      font-size: 26pt;
      font-weight: 800;
      margin: 0;
      line-height: 1.1;
    }
    .scan-en {
      font-size: 14pt;
      font-weight: 600;
      margin: 0;
      opacity: 0.92;
      direction: ltr;
    }
    .qr-wrap {
      width: 105mm;
      height: 105mm;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 5mm;
      background: #fff;
      border-radius: 5mm;
      box-shadow:
        0 0 0 2mm rgba(249, 115, 22, 0.85),
        0 0 0 3.5mm rgba(168, 85, 247, 0.35),
        0 16px 40px rgba(0, 0, 0, 0.45);
    }
    .qr-wrap img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .hint {
      font-size: 12pt;
      font-weight: 600;
      line-height: 1.5;
      max-width: 165mm;
      margin: 0;
      color: rgba(216, 180, 254, 0.95);
    }
    .url {
      font-size: 8pt;
      font-weight: 400;
      word-break: break-all;
      color: rgba(167, 139, 250, 0.65);
      margin: 2mm 0 0;
      direction: ltr;
      max-width: 180mm;
    }
    @media screen {
      body { background: #0a0510; padding: 16px 0; }
      .sheet { box-shadow: 0 24px 64px rgba(0,0,0,0.55); }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <p class="brand">בשכונה · Halloween</p>
    <h1 class="house-name">${houseName}</h1>
    ${boothBlock}
    <div class="scan-cheer">
      <p class="scan-he">סרקו לביקור!</p>
      <p class="scan-en">Scan to visit</p>
    </div>
    <div class="qr-wrap" aria-hidden="true">
      <img src="${dataUrl}" alt="" width="${HOUSE_VISIT_QR_PRINT_PX}" height="${HOUSE_VISIT_QR_PRINT_PX}" />
    </div>
    <p class="hint">סרקו עם מצלמת הטלפון — נפתחת מפת השכונה והבית מסומן «ביקרתי». מוזמנים!</p>
    ${urlBlock}
  </main>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
}

export function houseVisitQrPrintDocumentForHouse(options: {
  house: Pick<PublicHouse, "name" | "theme" | "soldOut" | "visit" | "boothNumber" | "address" | "isStub" | "isPractice">;
  dataUrl: string;
  url?: string;
}) {
  return houseVisitQrPrintDocumentHtml({
    houseName: visitQrPosterHouseTitle(options.house),
    boothLabel: visitQrPosterBoothLabel(options.house),
    dataUrl: options.dataUrl,
    url: options.url,
  });
}
