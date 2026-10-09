import { clusterBoothLabel } from "@/lib/cluster-booth";
import { houseHeadline } from "@/lib/labels";
import { NAMED_ADDRESS_PLACES } from "@/lib/named-address-places";
import { clusterIsSchoolCampus, isSchoolCampusAddress } from "@/lib/school-campus";
import type { PublicHouse } from "@/lib/types";

/** QR pixel size for print (~105mm at 300dpi — half A4 width). */
export const HOUSE_VISIT_QR_PRINT_PX = 1240;

const GOOGLE_FONTS_RUBIK =
  "https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800;900&display=swap";

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
    ? `<div class="booth-badge-wrap"><span class="booth-badge">${escapeVisitQrPrintHtml(boothLabel)}</span></div>`
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
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #1e1135;
      font-family: Rubik, "Segoe UI", Tahoma, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      position: relative;
      width: 194mm;
      min-height: 281mm;
      margin: 0 auto;
      padding: 10mm 12mm 12mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      background: #ffffff;
      border: 3.5mm solid #2e1065;
      border-radius: 6mm;
      outline: 1.5mm solid #ea580c;
      outline-offset: -5.5mm;
      overflow: hidden;
    }

    /* Background decorative SVG illustrations */
    .deco-top-left {
      position: absolute;
      top: 6mm;
      left: 7mm;
      width: 38mm;
      height: 38mm;
      pointer-events: none;
      z-index: 1;
    }
    .deco-top-right {
      position: absolute;
      top: 4mm;
      right: 5mm;
      width: 36mm;
      height: 36mm;
      pointer-events: none;
      z-index: 1;
    }
    .deco-bottom {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 48mm;
      pointer-events: none;
      z-index: 1;
    }

    .content-top {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3mm;
      max-width: 170mm;
      margin-top: 2mm;
    }

    .brand-tag {
      display: inline-flex;
      align-items: center;
      gap: 2mm;
      font-size: 11pt;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #7c2d12;
      background: #ffedd5;
      border: 1.5px solid #fdba74;
      padding: 1.5mm 5mm;
      border-radius: 999px;
    }

    .house-name {
      font-size: 34pt;
      font-weight: 900;
      line-height: 1.15;
      margin: 2mm 0 0;
      color: #c2410c;
      text-shadow: 1px 2px 0px #fed7aa;
      word-break: break-word;
    }

    .booth-badge-wrap {
      margin-top: 1mm;
    }
    .booth-badge {
      display: inline-block;
      font-size: 17pt;
      font-weight: 800;
      color: #581c87;
      background: #f3e8ff;
      border: 2px solid #a855f7;
      padding: 2mm 8mm;
      border-radius: 999px;
      box-shadow: 0 2px 6px rgba(168, 85, 247, 0.18);
    }

    .cta-section {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5mm;
      margin-top: 2mm;
    }

    .scan-he {
      font-size: 30pt;
      font-weight: 900;
      margin: 0;
      color: #581c87;
      line-height: 1.1;
      letter-spacing: -0.01em;
      text-shadow: 1px 1px 0px #e9d5ff;
    }

    .scan-en {
      font-size: 19pt;
      font-weight: 800;
      margin: 0;
      color: #047857;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      direction: ltr;
    }

    /* QR Code container with Halloween frame & cobweb accents */
    .qr-container {
      position: relative;
      z-index: 2;
      width: 122mm;
      height: 122mm;
      margin: 1mm auto 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr-frame {
      position: relative;
      width: 114mm;
      height: 114mm;
      background: #ffffff;
      padding: 4.5mm;
      border: 3.5px solid #ea580c;
      border-radius: 6mm;
      box-shadow: 0 4px 18px rgba(124, 45, 18, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr-frame img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    }

    /* Corner web decorations on the QR frame */
    .qr-corner {
      position: absolute;
      width: 16mm;
      height: 16mm;
      pointer-events: none;
    }
    .qr-corner.tl { top: -3mm; left: -3mm; }
    .qr-corner.tr { top: -3mm; right: -3mm; transform: scaleX(-1); }
    .qr-corner.bl { bottom: -3mm; left: -3mm; transform: scaleY(-1); }
    .qr-corner.br { bottom: -3mm; right: -3mm; transform: scale(-1, -1); }

    .content-bottom {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2mm;
      max-width: 165mm;
      margin-bottom: 26mm; /* Space cleanly above bottom silhouette */
    }

    .hint-bubble {
      background: #faf5ff;
      border: 2px dashed #c084fc;
      border-radius: 4mm;
      padding: 3mm 7mm;
      box-shadow: 0 2px 8px rgba(192, 132, 252, 0.12);
    }
    .hint {
      font-size: 13pt;
      font-weight: 700;
      line-height: 1.4;
      margin: 0;
      color: #3b0764;
    }

    .url {
      font-size: 8pt;
      font-weight: 500;
      color: #6b7280;
      margin: 1mm 0 0;
      direction: ltr;
      word-break: break-all;
    }

    @media screen {
      body {
        background: #f3f0f7;
        padding: 20px 0;
      }
      .sheet {
        box-shadow: 0 12px 36px rgba(46, 16, 101, 0.15);
      }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <!-- Top-left Moon and Bats (SVG) -->
    <svg class="deco-top-left" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <!-- Glowing full moon -->
      <circle cx="50" cy="50" r="42" fill="#fef08a" stroke="#facc15" stroke-width="2.5" />
      <circle cx="36" cy="38" r="6" fill="#fde047" opacity="0.6" />
      <circle cx="62" cy="58" r="9" fill="#fde047" opacity="0.5" />
      <circle cx="44" cy="68" r="5" fill="#fde047" opacity="0.5" />
      <!-- Flying bats silhouettes -->
      <path d="M78 22 C73 17 65 19 62 25 C60 19 52 17 47 22 C49 26 53 28 58 28 C59 32 65 32 67 28 C72 28 76 26 78 22 Z" fill="#2e1065" />
      <path d="M102 38 C98 34 91 36 88 41 C86 36 80 34 76 38 C77 42 81 43 85 43 C86 46 91 46 92 43 C96 43 100 42 102 38 Z" fill="#2e1065" transform="rotate(-8 90 40)" />
      <path d="M86 10 C83 7 78 8 76 12 C74 8 69 7 66 10 C67 13 70 14 73 14 C74 17 78 17 79 14 C82 14 85 13 86 10 Z" fill="#2e1065" transform="scale(0.8) translate(15, -4)" />
    </svg>

    <!-- Top-right Cobweb with Spider (SVG) -->
    <svg class="deco-top-right" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M120 0 L0 0 M120 0 L30 40 M120 0 L60 80 M120 0 L90 115 M120 0 L120 120" stroke="#7e22ce" stroke-width="1.8" stroke-opacity="0.45" />
      <path d="M40 0 Q55 15 65 22 Q85 30 100 35 M70 0 Q80 25 90 40 Q105 52 120 58 M95 0 Q105 35 120 50" stroke="#a855f7" stroke-width="1.5" stroke-opacity="0.4" fill="none" />
      <!-- Hanging thread and spider -->
      <line x1="45" y1="20" x2="45" y2="78" stroke="#3b0764" stroke-width="1.2" stroke-dasharray="2 2" />
      <ellipse cx="45" cy="85" rx="6" ry="5" fill="#3b0764" />
      <circle cx="45" cy="81" r="3.5" fill="#3b0764" />
      <!-- Spider legs -->
      <path d="M40 83 Q32 80 30 87 M40 85 Q30 86 32 93 M50 83 Q58 80 60 87 M50 85 Q60 86 58 93" stroke="#3b0764" stroke-width="1.5" fill="none" stroke-linecap="round" />
    </svg>

    <!-- Top section: Brand, House Name, Booth -->
    <div class="content-top">
      <div class="brand-tag">
        <span>🎃</span>
        <span>בשכונה · HALLOWEEN</span>
        <span>👻</span>
      </div>
      <h1 class="house-name">${houseName}</h1>
      ${boothBlock}
    </div>

    <!-- Middle CTA: Scan me for visit -->
    <div class="cta-section">
      <p class="scan-he">סרקו אותי לביקור!</p>
      <p class="scan-en">Scan me for visit</p>
    </div>

    <!-- QR Code in Halloween framed container -->
    <div class="qr-container">
      <div class="qr-frame">
        <!-- Corner cobweb SVGs -->
        <svg class="qr-corner tl" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M0 0 L50 0 M0 0 L35 35 M0 0 L0 50" stroke="#c2410c" stroke-width="2" />
          <path d="M22 0 Q22 22 0 22 M40 0 Q40 40 0 40" stroke="#ea580c" stroke-width="1.8" fill="none" />
        </svg>
        <svg class="qr-corner tr" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M0 0 L50 0 M0 0 L35 35 M0 0 L0 50" stroke="#c2410c" stroke-width="2" />
          <path d="M22 0 Q22 22 0 22 M40 0 Q40 40 0 40" stroke="#ea580c" stroke-width="1.8" fill="none" />
        </svg>
        <svg class="qr-corner bl" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M0 0 L50 0 M0 0 L35 35 M0 0 L0 50" stroke="#c2410c" stroke-width="2" />
          <path d="M22 0 Q22 22 0 22 M40 0 Q40 40 0 40" stroke="#ea580c" stroke-width="1.8" fill="none" />
        </svg>
        <svg class="qr-corner br" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M0 0 L50 0 M0 0 L35 35 M0 0 L0 50" stroke="#c2410c" stroke-width="2" />
          <path d="M22 0 Q22 22 0 22 M40 0 Q40 40 0 40" stroke="#ea580c" stroke-width="1.8" fill="none" />
        </svg>

        <img src="${dataUrl}" alt="קוד QR לביקור" width="${HOUSE_VISIT_QR_PRINT_PX}" height="${HOUSE_VISIT_QR_PRINT_PX}" />
      </div>
    </div>

    <!-- Bottom Instructions -->
    <div class="content-bottom">
      <div class="hint-bubble">
        <p class="hint">סרקו עם מצלמת הטלפון — נפתחת מפת השכונה והבית מסומן «ביקרתי»! מוזמנים ✨</p>
      </div>
      ${urlBlock}
    </div>

    <!-- Bottom Silhouette: Haunted house, hill, crooked trees, carved jack-o'-lanterns -->
    <svg class="deco-bottom" viewBox="0 0 600 130" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <!-- Ground / hill silhouette in deep purple -->
      <path d="M0 70 Q 140 45 280 60 Q 420 75 600 48 L 600 130 L 0 130 Z" fill="#2e1065" />
      <path d="M0 85 Q 180 65 350 78 Q 480 88 600 70 L 600 130 L 0 130 Z" fill="#1e0a45" />

      <!-- Haunted house silhouette (left side, like inspiration image) -->
      <g fill="#1e0a45">
        <!-- Main house base -->
        <rect x="25" y="32" width="48" height="52" />
        <!-- Pitched roofs and towers -->
        <polygon points="20,32 49,2 78,32" />
        <rect x="73" y="42" width="34" height="42" />
        <polygon points="70,42 90,18 110,42" />
        <rect x="94" y="24" width="6" height="14" />
        <!-- Spooky tower spire -->
        <polygon points="46,2 49,-8 52,2" />
      </g>
      <!-- Yellow glowing windows -->
      <g fill="#fde047">
        <rect x="34" y="22" width="7" height="9" rx="1" />
        <rect x="56" y="22" width="7" height="9" rx="1" />
        <rect x="35" y="44" width="8" height="11" rx="1" />
        <rect x="54" y="44" width="8" height="11" rx="1" />
        <rect x="80" y="48" width="7" height="9" rx="1" />
        <rect x="94" y="48" width="7" height="9" rx="1" />
      </g>

      <!-- Bare crooked trees -->
      <path d="M125 72 L127 40 L120 32 M127 40 L134 30 M126 50 L118 45 M127 46 L135 44" stroke="#1e0a45" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <path d="M142 75 L144 52 L138 46 M144 52 L150 44" stroke="#1e0a45" stroke-width="2" stroke-linecap="round" fill="none" />

      <!-- Right side small haunted castle / cottage silhouette -->
      <g fill="#1e0a45">
        <rect x="520" y="38" width="36" height="42" />
        <polygon points="516,38 538,12 560,38" />
        <polygon points="536,12 538,2 540,12" />
        <rect x="556" y="46" width="22" height="34" />
        <polygon points="552,46 567,26 582,46" />
      </g>
      <g fill="#fde047">
        <rect x="528" y="28" width="6" height="8" rx="1" />
        <rect x="540" y="48" width="6" height="8" rx="1" />
        <rect x="564" y="52" width="6" height="8" rx="1" />
      </g>
      <path d="M495 72 L493 42 L486 34 M493 42 L501 32 M494 54 L502 48" stroke="#1e0a45" stroke-width="2.5" stroke-linecap="round" fill="none" />

      <!-- Pumpkins / Jack-o-lanterns with glowing faces on the hills -->
      <!-- Center-left pumpkin -->
      <g transform="translate(180, 52)">
        <ellipse cx="22" cy="24" rx="20" ry="16" fill="#ea580c" />
        <!-- Stem -->
        <path d="M21 9 Q 22 2 28 3 L 26 9 Z" fill="#15803d" />
        <!-- Pumpkin segment curves -->
        <path d="M14 10 C 8 16 8 32 14 38 M 30 10 C 36 16 36 32 30 38" stroke="#c2410c" stroke-width="1.8" fill="none" />
        <!-- Carved glowing face -->
        <polygon points="12,18 16,14 19,18" fill="#fef08a" />
        <polygon points="25,18 28,14 32,18" fill="#fef08a" />
        <polygon points="22,20 20,23 24,23" fill="#fef08a" />
        <path d="M11 26 Q 22 36 33 26 Q 29 32 22 32 Q 15 32 11 26 Z" fill="#fef08a" />
      </g>

      <!-- Center-right smaller pumpkin -->
      <g transform="translate(380, 56) scale(0.85)">
        <ellipse cx="20" cy="22" rx="18" ry="14" fill="#f97316" />
        <path d="M19 9 Q 20 3 25 4 L 23 9 Z" fill="#15803d" />
        <polygon points="12,18 15,14 18,18" fill="#fef08a" />
        <polygon points="23,18 26,14 29,18" fill="#fef08a" />
        <path d="M12 25 Q 20 33 29 25 Q 21 30 12 25 Z" fill="#fef08a" />
      </g>
    </svg>
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
