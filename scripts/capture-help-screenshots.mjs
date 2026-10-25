#!/usr/bin/env node
/**
 * Capture real app screenshots for help guides (mobile viewport).
 * Usage: node scripts/capture-help-screenshots.mjs
 * Env: BASE_URL (default production), HEADED=1 for visible browser
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { waitForCatalog, firstRealHouseId, openHouseByFocus } from "./lib/e2e-helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "images", "help");
const BASE = process.env.BASE_URL ?? "https://my-hollaween-app.vercel.app";
const HEADED = process.env.HEADED === "1";

mkdirSync(join(outDir, "install"), { recursive: true });

async function launchBrowser() {
  return chromium.launch({
    headless: !HEADED,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
}

async function shot(page, name, options = {}) {
  const path = join(outDir, name);
  await page.screenshot({ path, type: "png", ...options });
  console.log("  ✓", name);
}

async function openFilter(page) {
  await page.getByRole("button", { name: /^סינון/ }).first().click();
  await page.getByRole("button", { name: /הצג תוצאות/ }).waitFor();
}

async function resetFilters(page) {
  await openFilter(page);
  const reset = page.getByRole("button", { name: "איפוס" });
  if (await reset.isEnabled()) {
    await reset.click();
    await page.getByRole("button", { name: /הצג תוצאות/ }).click();
  } else {
    await page.keyboard.press("Escape");
  }
  await page.waitForTimeout(400);
}

async function waitForMap(page) {
  await waitForCatalog(page);
  await page.waitForTimeout(1200);
  try {
    await page.locator(".leaflet-tile-loaded").first().waitFor({ timeout: 8000 });
  } catch {
    /* map tiles optional */
  }
}

async function captureAddHouse(page) {
  console.log("add-house");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await waitForMap(page);
  await page.locator('[aria-label="תפריט"]').click();
  await page.getByText("הוספה").waitFor();
  await page.waitForTimeout(300);
  await shot(page, "step-1-menu.png");

  await page.goto(`${BASE}/add`, { waitUntil: "domcontentloaded" });
  await page.locator("form").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(800);

  const addressClip = await page.evaluate(() => {
    const sections = document.querySelectorAll("form section");
    const home = sections[0];
    const where = sections[1];
    if (!home || !where) return null;
    const top = home.getBoundingClientRect().top;
    const bottom = where.getBoundingClientRect().bottom;
    const height = bottom - top + 8;
    if (height <= 1) return null;
    return {
      x: 0,
      y: Math.max(0, top - 4),
      width: document.documentElement.clientWidth,
      height,
    };
  });
  if (addressClip?.height > 1) {
    await shot(page, "step-2-form.png", { clip: addressClip });
  } else {
    await page.getByText("שם הבית").scrollIntoViewIfNeeded();
    await shot(page, "step-2-form.png");
  }

  await page.getByText("מתי פתוחים").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const detailsClip = await page.evaluate(() => {
    const sections = [...document.querySelectorAll("form section")];
    const hoursSection = sections.find((s) => s.querySelector("h2")?.textContent?.trim() === "מתי פתוחים");
    const traitsSection = sections.find((s) => s.querySelector("h2")?.textContent?.trim() === "מה יפגשו בבית");
    const start = hoursSection ?? traitsSection;
    const end = traitsSection ?? hoursSection;
    if (!start || !end) return null;
    const top = start.getBoundingClientRect().top;
    const bottom = end.getBoundingClientRect().bottom;
    const height = bottom - top + 8;
    if (height <= 0) return null;
    return {
      x: 0,
      y: Math.max(0, top - 4),
      width: document.documentElement.clientWidth,
      height,
    };
  });
  if (detailsClip?.height > 1) {
    await shot(page, "step-3-details.png", { clip: detailsClip });
  } else {
    await shot(page, "step-3-details.png");
  }

  await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return;
    main.innerHTML = `
      <div class="house-added-success space-y-4 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-400/30">
        <div class="flex flex-col items-center gap-2 text-center">
          <h1 class="font-display text-2xl text-orange-300">הבית במפה!</h1>
          <p class="text-base text-orange-100">בית משפחת לוי נשמר ומופיע במפה.</p>
        </div>
        <div class="rounded-xl bg-[#12081a] p-3 ring-1 ring-orange-500/30 text-center">
          <p class="text-base text-orange-200">קוד עריכה</p>
          <p class="mt-1 font-mono text-3xl tracking-[0.35em] text-orange-200" dir="ltr">482916</p>
        </div>
      </div>
    `;
  });
  await page.waitForTimeout(200);
  await shot(page, "step-3-done.png");
}

async function captureShareEditCode(page) {
  console.log("share-edit-code");
  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
  await waitForMap(page);
  const houseId = await firstRealHouseId(page);
  const house = await page.evaluate((id) => {
    const houses = JSON.parse(localStorage.getItem("hw-catalog-cache") ?? "{}").houses ?? [];
    return houses.find((item) => item.id === id) ?? null;
  }, houseId);

  if (!house) throw new Error("No catalog house for share-edit-code screenshots");

  await page.evaluate(
    ({ h }) => {
      localStorage.setItem("hw-rehearsal-scene", "open");
      localStorage.setItem(
        "hw-my-houses",
        JSON.stringify([{ id: h.id, name: h.name, editCode: "482916", preview: h }]),
      );
      window.dispatchEvent(new Event("hw-owned-changed"));
    },
    { h: house },
  );

  // Dialog only — menu PNG removed from help (showed real addresses).
  const detail = await openHouseByFocus(page, BASE, house.id);
  await detail.getByRole("button", { name: "פעולות" }).click();
  await page.getByRole("menuitem", { name: "קוד עריכה ומכשירים" }).waitFor();
  await page.getByRole("menuitem", { name: "קוד עריכה ומכשירים" }).click();
  await page.getByRole("dialog").getByText("קוד עריכה ומכשירים", { exact: true }).waitFor();
  await page.waitForTimeout(300);
  await shot(page, "share-edit-code-dialog.png");
  await page.keyboard.press("Escape");
}

async function captureFilter(page) {
  console.log("filter");
  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
  await waitForMap(page);
  await resetFilters(page);

  await openFilter(page);
  await page.waitForTimeout(400);
  await shot(page, "filter-1-open.png");

  await page.getByText("מותאם אישית").click();
  await page.waitForTimeout(400);
  await shot(page, "filter-3-custom-times.png");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const houses = JSON.parse(localStorage.getItem("hw-catalog-cache") ?? "{}").houses ?? [];
    if (houses[0]) {
      localStorage.setItem("hw-liked-houses", JSON.stringify([houses[0].id]));
      window.dispatchEvent(new Event("hw-liked-changed"));
    }
  });
  await openFilter(page);
  await page.getByText("שמורים", { exact: true }).click();
  await page.getByRole("button", { name: /הצג תוצאות/ }).click();
  await page.getByRole("button", { name: /סינון \(1\)/ }).first().waitFor();
  await page.waitForTimeout(1500);
  await shot(page, "filter-2-map-dim.png");

  await page.getByRole("button", { name: "רשימה" }).click();
  await page.getByRole("button", { name: "רשימה", pressed: true }).waitFor();
  await page.waitForTimeout(500);
  await shot(page, "filter-4-results.png");
}

async function ensureMapView(page) {
  await page.evaluate(() => {
    sessionStorage.setItem("hw-home-view", "map");
    window.dispatchEvent(new Event("hw-home-view"));
  });
  const mapBtn = page.getByRole("button", { name: "מפה", exact: true });
  if ((await mapBtn.getAttribute("aria-pressed")) !== "true") {
    await mapBtn.click();
    await page.getByRole("button", { name: "מפה", exact: true, pressed: true }).waitFor();
  }
  await waitForMap(page);
}

async function captureRoute(page) {
  console.log("create-route + during-route");
  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
  await waitForMap(page);
  await resetFilters(page);
  await ensureMapView(page);

  await page.evaluate(() => {
    localStorage.setItem("hw-visited-houses", "[]");
    localStorage.setItem("hw-skipped-houses", "[]");
    window.dispatchEvent(new Event("hw-visited-changed"));
    window.dispatchEvent(new Event("hw-skipped-changed"));
  });

  await openFilter(page);
  await page.getByText("פתוחים עכשיו").click();
  await page.getByRole("button", { name: /הצג תוצאות/ }).click();
  await page.waitForTimeout(400);
  await openFilter(page);
  await page.waitForTimeout(300);
  await shot(page, "route-1-filters.png");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "נקודת התחלה" }).click();
  await page.getByText("מרכז השכונה").waitFor();
  await page.waitForTimeout(400);
  await shot(page, "route-2-origin.png");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: "מסלול" }).click();
  await page.getByRole("button", { name: "יציאה מהמסלול", pressed: true }).waitFor({ timeout: 10_000 }).catch(async () => {
    await page.getByRole("button", { name: "מסלול" }).click();
  });
  await ensureMapView(page);
  await page.waitForTimeout(2500);
  try {
    await page.locator(".leaflet-overlay-pane path").first().waitFor({ timeout: 12_000 });
  } catch {
    console.warn("  (route line not visible — map shot anyway)");
  }
  await shot(page, "route-3-enable.png");
  await shot(page, "route-during-map.png");

  await page.getByRole("button", { name: "רשימה" }).click();
  await page.getByRole("button", { name: "רשימה", pressed: true }).waitFor();
  await page.waitForTimeout(600);
  await shot(page, "route-4-summary.png");
  await shot(page, "route-during-exit.png");

  const houseId = await firstRealHouseId(page);
  if (houseId) {
    const detail = await openHouseByFocus(page, BASE, houseId);
    await detail.getByRole("button", { name: "פעולות" }).click();
    await page.getByRole("menuitem", { name: "ביקרתי" }).waitFor();
    await page.waitForTimeout(300);
    await shot(page, "route-during-actions.png");
    await page.keyboard.press("Escape");
  }
}

function mockNightPassAccess(houseId) {
  return {
    enabled: true,
    access: {
      familyCode: "482-916",
      connectedCount: 1,
      maxDevices: 4,
      devices: [
        {
          sessionId: "demo-session",
          holderName: "דנה",
          holderPhone: "050-1234567",
          registeredAt: new Date().toISOString(),
          role: "editor",
          isThisDevice: false,
        },
      ],
      resetCount: 0,
    },
    thisDeviceRegistered: false,
    permissions: {
      canPromoteOwner: true,
      canRemoveDevices: true,
      canResetCode: true,
      canShareInvite: true,
    },
  };
}

async function captureEventDevice(page) {
  console.log("event-device (night pass / edit code)");
  await page.route("**/api/night-passes/me", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enabled: true,
        registered: false,
        viewer: "public",
      }),
    });
  });

  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
  await waitForMap(page);

  await page.evaluate(() => {
    localStorage.setItem(
      "hw-night-pass-state",
      JSON.stringify({ enabled: true, registered: false, viewer: "public" }),
    );
    window.dispatchEvent(new Event("hw-night-pass-changed"));
  });
  await page.waitForTimeout(600);
  const banner = page.getByRole("button", { name: /יש לי קוד כניסה/ });
  if (await banner.count()) {
    await banner.scrollIntoViewIfNeeded();
    await shot(page, "event-device-visitor-banner.png", {
      clip: { x: 0, y: 0, width: 390, height: 120 },
    });
    await banner.click();
    await page.getByLabel("קוד כניסה (6 ספרות)").waitFor({ timeout: 8000 });
    await page.waitForTimeout(300);
    await shot(page, "event-device-visitor-register.png");
    await page.keyboard.press("Escape");
  }

  const houseId = await firstRealHouseId(page);
  if (!houseId) throw new Error("No house for event-device screenshots");

  await page.route(`**/api/houses/${houseId}/night-passes`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(mockNightPassAccess(houseId)),
    });
  });

  await page.evaluate(
    ({ id }) => {
      localStorage.setItem(
        "hw-my-houses",
        JSON.stringify([{ id, name: "בית לדוגמה", editCode: "482916" }]),
      );
      window.dispatchEvent(new Event("hw-owned-changed"));
    },
    { id: houseId },
  );

  let dialogOpened = false;
  try {
    const detail = await openHouseByFocus(page, BASE, houseId);
    await detail.getByRole("button", { name: "פעולות" }).click();
    await page.getByRole("menuitem", { name: "קוד עריכה ומכשירים" }).waitFor();
    await page.waitForTimeout(250);
    const menuClip = await page.evaluate(() => {
      const menu = document.querySelector('[role="menu"]');
      if (!menu) return null;
      const r = menu.getBoundingClientRect();
      return { x: Math.max(0, r.x - 8), y: r.y - 8, width: r.width + 16, height: r.height + 16 };
    });
    if (menuClip) {
      await shot(page, "event-device-owner-menu.png", { clip: menuClip });
    }
    await page.getByRole("menuitem", { name: "קוד עריכה ומכשירים" }).click();
    const dialog = page.getByRole("dialog").filter({ hasText: "קוד עריכה ומכשירים" });
    await dialog.waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForTimeout(500);
    const box = await dialog.boundingBox();
    if (box) await shot(page, "event-device-owner-dialog.png", { clip: box });
    dialogOpened = true;
    await page.keyboard.press("Escape");
  } catch (error) {
    console.warn("  (house focus failed — using styled fallback for owner dialog)", error.message);
  }

  if (!dialogOpened) {
    await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        "beforeend",
        `<div class="fixed bottom-24 left-4 z-[200]" dir="rtl">
          <div role="menu" class="min-w-[12rem] rounded-xl bg-[#1d1028] p-1 ring-1 ring-orange-500/30 shadow-lg">
            <button type="button" role="menuitem" class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-base text-orange-50">קוד עריכה ומכשירים</button>
            <button type="button" role="menuitem" class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-base text-orange-50/80">עריכה</button>
          </div>
        </div>`,
      );
    });
    await shot(page, "event-device-owner-menu.png", {
      clip: { x: 0, y: 480, width: 390, height: 160 },
    });
    await page.evaluate(() => {
      document.querySelector('[role="menu"]')?.closest(".fixed")?.remove();
    });

    await page.goto(`${BASE}/add`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        "beforeend",
        `<div class="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div role="dialog" class="house-edit-modal w-full max-w-lg rounded-2xl bg-[#1d1028] p-5 ring-1 ring-orange-500/30">
            <h2 class="text-center text-xl font-semibold text-orange-100">קוד עריכה ומכשירים</h2>
            <p class="mt-1 text-center text-sm text-violet-300">בית לדוגמה</p>
            <div class="mt-4 space-y-4">
              <div class="space-y-2">
                <label class="text-base text-violet-300">קוד כניסה (6 ספרות)</label>
                <input readonly value="482 916" dir="ltr" class="w-full rounded-xl border border-orange-500/25 bg-black/35 px-4 py-3 text-center font-mono text-2xl tracking-[0.25em] text-orange-100" />
                <div class="flex justify-center gap-2">
                  <button type="button" class="rounded-md border border-orange-500/25 px-3 py-2 text-sm text-orange-100">העתק</button>
                </div>
              </div>
              <h3 class="border-t border-orange-500/20 pt-4 text-center text-base font-medium text-orange-200">מכשירים מחוברים</h3>
              <ul class="divide-y divide-orange-500/15 overflow-hidden rounded-xl ring-1 ring-orange-500/20">
                <li class="px-3 py-3 text-center text-base text-violet-200">דנה · 050-1234567 · <span class="text-violet-100">עורך</span></li>
              </ul>
              <button type="button" class="h-11 w-full rounded-md border border-input text-orange-100">סגירה</button>
            </div>
          </div>
        </div>`,
      );
    });
    await page.waitForTimeout(200);
    const dialog = page.getByRole("dialog");
    await shot(page, "event-device-owner-dialog.png", { clip: await dialog.boundingBox() });
    await page.evaluate(() => {
      document.querySelector(".house-edit-modal")?.closest(".fixed")?.remove();
    });
  }

  await page.goto(`${BASE}/add`, { waitUntil: "domcontentloaded" });
  await page.locator("form").waitFor({ timeout: 15_000 }).catch(() => {});
  await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return;
    main.innerHTML = `
      <div class="house-added-success space-y-6 rounded-2xl bg-[#1d1028] p-5 ring-1 ring-orange-400/30">
        <div class="flex flex-col items-center gap-2 text-center">
          <h1 class="font-display text-2xl text-orange-300">הבית במפה!</h1>
          <p class="text-base text-violet-100">בית לדוגמה על המפה.</p>
        </div>
        <div class="flex flex-col gap-2">
          <button type="button" class="inline-flex h-11 w-full items-center justify-center rounded-md bg-orange-500 text-black">צפו בבית במפה</button>
          <button type="button" class="inline-flex h-11 w-full items-center justify-center rounded-md border border-input">עריכת מלאי ופרטים</button>
          <button type="button" class="inline-flex h-11 w-full items-center justify-center rounded-md border border-orange-400/50 bg-orange-500/10 text-orange-100">קוד עריכה ומכשירים</button>
        </div>
      </div>
    `;
  });
  await page.waitForTimeout(200);
  await shot(page, "event-device-owner-success.png");

  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
  await waitForMap(page);
  await page.evaluate(() => {
    localStorage.setItem(
      "hw-night-pass-state",
      JSON.stringify({
        enabled: true,
        registered: true,
        viewer: "pass",
        holderName: "יוסי",
        holderPhone: "050-9998877",
      }),
    );
    window.dispatchEvent(new Event("hw-night-pass-changed"));
  });
  await page.locator('[aria-label="תפריט"]').click();
  await page.getByText("מכשיר מחובר").waitFor({ timeout: 8000 });
  await page.waitForTimeout(300);
  const strip = page.locator("text=מכשיר מחובר").locator("..").locator("..");
  await shot(page, "event-device-visitor-menu.png", {
    clip: await strip.first().boundingBox(),
  });
}

async function captureInstall(page) {
  console.log("install (app in mobile browser)");
  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
  await waitForMap(page);
  await shot(page, "install/android-1-app.png");
  await shot(page, "install/ios-2-share.png");
  await page.locator('[aria-label="תפריט"]').click();
  await page.getByRole("heading", { name: "תפריט" }).waitFor();
  await page.waitForTimeout(300);
  await shot(page, "install/android-2-menu.png");
  await page.getByText("שאלות ותשובות").scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await shot(page, "install/ios-3-add-home.png");
  await page.goto(`${BASE}/help/install`, { waitUntil: "domcontentloaded" });
  await page.getByText("אייפון").waitFor();
  await page.waitForTimeout(300);
  await shot(page, "install/android-3-confirm.png");
}

async function main() {
  console.log(`Capturing help screenshots from ${BASE}`);
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: "he-IL",
    geolocation: { latitude: 32.0912, longitude: 34.8031 },
    permissions: ["geolocation"],
    colorScheme: "dark",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25_000);

  if (process.env.CAPTURE === "event-device") {
    await captureEventDevice(page);
  } else {
    await captureAddHouse(page);
    await captureShareEditCode(page);
    await captureFilter(page);
    await captureRoute(page);
    await captureInstall(page);
    if (process.env.CAPTURE !== "skip-event-device") {
      await captureEventDevice(page);
    }
  }

  await context.close();
  await browser.close();
  console.log(`Done — wrote PNGs to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
