/** QR pixel size for print (~105mm at 300dpi — half A4 width). */
export const HOUSE_VISIT_QR_PRINT_PX = 1240;

export function escapeVisitQrPrintHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function houseVisitQrPrintDocumentHtml(options: {
  houseName: string;
  dataUrl: string;
  /** Optional — omitted from poster by default. */
  url?: string;
}) {
  const houseName = escapeVisitQrPrintHtml(options.houseName);
  const dataUrl = escapeVisitQrPrintHtml(options.dataUrl);
  const urlBlock = options.url
    ? `<p class="url">${escapeVisitQrPrintHtml(options.url)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>QR ביקור — ${houseName}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body {
      font-family: system-ui, "Segoe UI", sans-serif;
      color: #1a0a2e;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8mm;
      padding: 10mm 8mm;
      text-align: center;
    }
    .house-name {
      font-size: 28pt;
      font-weight: 700;
      line-height: 1.25;
      max-width: 180mm;
      margin: 0;
    }
    .scan-he {
      font-size: 22pt;
      font-weight: 600;
      margin: 0;
      letter-spacing: 0.02em;
    }
    .scan-en {
      font-size: 16pt;
      font-weight: 500;
      margin: 0;
      color: #444;
      direction: ltr;
    }
    .qr-wrap {
      width: 105mm;
      height: 105mm;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4mm;
      border: 2px solid #e8e0f0;
      border-radius: 4mm;
    }
    .qr-wrap img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    }
    .hint {
      font-size: 11pt;
      line-height: 1.45;
      max-width: 160mm;
      margin: 0;
      color: #555;
    }
    .url {
      font-size: 8pt;
      word-break: break-all;
      color: #888;
      margin: 4mm 0 0;
      direction: ltr;
      max-width: 180mm;
    }
    @media screen {
      body { background: #f3f0f8; }
      .sheet {
        width: 210mm;
        min-height: 297mm;
        margin: 16px auto;
        box-shadow: 0 4px 24px rgba(0,0,0,0.12);
      }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <h1 class="house-name">${houseName}</h1>
    <p class="scan-he">סרקו לביקור</p>
    <p class="scan-en">Scan to visit</p>
    <div class="qr-wrap" aria-hidden="true">
      <img src="${dataUrl}" alt="" width="${HOUSE_VISIT_QR_PRINT_PX}" height="${HOUSE_VISIT_QR_PRINT_PX}" />
    </div>
    <p class="hint">סרקו עם מצלמת הטלפון — נפתחת מפת השכונה והבית מסומן «ביקרתי».</p>
    ${urlBlock}
  </main>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
}
