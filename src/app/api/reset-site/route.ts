/** Bypasses the service worker — clears broken SW/cache without reinstalling the PWA icon. */
export async function GET() {
  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HallowHood · איפוס</title>
  <style>
    body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;background:#12081a;color:#f4e7c8;font-family:system-ui,sans-serif;text-align:center}
    h1{font-size:1.2rem;color:#fdba74;margin:0 0 8px}
    p{color:#ddd6fe;line-height:1.5;margin:0}
  </style>
</head>
<body>
  <div>
    <h1>מנקים זיכרון ישן…</h1>
    <p>עוד רגע חוזרים למפה. אין צורך להסיר את האייקון מהמסך.</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Clear-Site-Data": '"cache", "storage", "executionContexts"',
      "Cache-Control": "no-store",
      Refresh: "1; url=/",
    },
  });
}
