import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43127";
const IS_CI = process.env.CI === "true" || process.env.CI === "1";

let failures = 0;

function fail(message) {
  console.error("FAIL", message);
  failures += 1;
}

function pass(message) {
  console.log("ok", message);
}

async function main() {
  const browser = await chromium.launch({
    ...(IS_CI ? {} : { channel: "chrome" }),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "he-IL",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration("/");
    return Boolean(registration?.active);
  });
  await page.waitForFunction(async () => {
    const shellKey = (await caches.keys()).find((key) => key.startsWith("hw-shell"));
    if (!shellKey) return false;
    const cache = await caches.open(shellKey);
    const requests = await cache.keys();
    return requests.some((request) => {
      const path = new URL(request.url).pathname;
      return path.includes("/app.css") || path.includes("/offline.html");
    });
  });

  await page.goto(`${BASE}/offline.html`, { waitUntil: "domcontentloaded" });

  const cachedPaths = await page.evaluate(async () => {
    const keys = await caches.keys();
    const shellKey = keys.find((key) => key.startsWith("hw-shell"));
    if (!shellKey) return [];
    const cache = await caches.open(shellKey);
    const requests = await cache.keys();
    return requests.map((request) => new URL(request.url).pathname);
  });

  const hasCached = (fragment) => cachedPaths.some((path) => path.includes(fragment));

  if (!cachedPaths.length) fail("SW precache should open hw-shell cache");
  else pass("SW shell cache is available after registration");

  for (const path of ["/app.css", "/offline.html"]) {
    if (!hasCached(path)) fail(`SW precache should include ${path}`);
    else pass(`SW precache includes ${path}`);
  }

  await context.close();
  await browser.close();

  if (failures) {
    console.error(`SW precache check failed (${failures} checks)`);
    process.exit(1);
  }
  console.log("PASS SW precache");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
