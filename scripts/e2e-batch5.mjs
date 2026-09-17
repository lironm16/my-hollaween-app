import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43127";
const OUT = process.env.E2E_ARTIFACTS_DIR ?? join(process.cwd(), "artifacts", "e2e");
const IS_CI = process.env.CI === "true" || process.env.CI === "1";

let failures = 0;

function fail(message) {
  console.error("FAIL", message);
  failures += 1;
}

function pass(message) {
  console.log("ok", message);
}

async function launchBrowser() {
  return chromium.launch({
    ...(IS_CI ? {} : { channel: "chrome" }),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
}

async function gotoPage(page, url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(400);
    }
  }
}

async function waitForCatalog(page) {
  await page.getByText(/בתים/).first().waitFor();
  await page.waitForFunction(() => {
    try {
      const raw = localStorage.getItem("hw-catalog-cache");
      const catalog = raw ? JSON.parse(raw) : null;
      return Array.isArray(catalog?.houses) && catalog.houses.length > 0;
    } catch {
      return false;
    }
  });
}

function validHousePayload(name = "בית batch5") {
  return {
    name,
    theme: "pumpkin",
    address: "חרוזים 8",
    arrival: "קומה 2",
    description: "בדיקת batch5",
    lat: 32.0916477,
    lng: 34.8028691,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    openHours: [{ from: "17:00", to: "21:00" }],
    notes: "",
    accessible: false,
    decorLevel: "medium",
    decorated: true,
  };
}

async function createTestHouse() {
  const res = await fetch(`${BASE}/api/houses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validHousePayload()),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.house?.id || !data.editCode) return null;
  return data;
}

async function adminDeleteHouse(houseId) {
  const login = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "pumpkin2026" }),
  });
  const cookie = login.headers.getSetCookie?.()?.[0]?.split(";")[0] ?? "";
  if (!cookie) return;
  await fetch(`${BASE}/api/admin/houses/${encodeURIComponent(houseId)}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "he-IL",
    geolocation: { latitude: 32.0912, longitude: 34.8031 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);

  await gotoPage(page, `${BASE}/?rehearsal=open`);
  await waitForCatalog(page);
  const focusTarget = await page.evaluate(() => {
    const houses = JSON.parse(localStorage.getItem("hw-catalog-cache") ?? "{}").houses ?? [];
    const house =
      houses.find((item) => item.name?.includes("דלעת")) ??
      houses.find((item) => !/batch5|E2E|אינטגרציה/i.test(item.name ?? "")) ??
      houses[0];
    return house ? { id: house.id, name: house.name } : null;
  });
  if (!focusTarget) fail("SHARE-02 could not pick a catalog house");
  else {
    await gotoPage(page, `${BASE}/house/${encodeURIComponent(focusTarget.id)}`);
    await page.getByText(focusTarget.name, { exact: false }).first().waitFor();
    pass("SHARE-02 house share page shows the selected house");

    await gotoPage(page, `${BASE}/?focus=${encodeURIComponent(focusTarget.id)}&rehearsal=open`);
    await waitForCatalog(page);
    const focusDialog = page.getByRole("dialog");
    await focusDialog.waitFor();
    await focusDialog.getByText(focusTarget.name, { exact: false }).first().waitFor();
    pass("SHARE-02 focus link opens house detail overlay");
  }

  const owned = await createTestHouse();
  if (!owned) fail("EDIT-02 could not create a test house");
  else {
    await gotoPage(page, `${BASE}/my-houses?rehearsal=open`);
    await page.evaluate(
      ({ house, editCode }) => {
        localStorage.setItem("hw-rehearsal-scene", "open");
        localStorage.setItem(
          "hw-my-houses",
          JSON.stringify([{ id: house.id, name: house.name, editCode, preview: house }]),
        );
        window.dispatchEvent(new Event("hw-owned-changed"));
        window.dispatchEvent(new Event("hw-clock-changed"));
      },
      { house: owned.house, editCode: owned.editCode },
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => localStorage.getItem("hw-rehearsal-scene") === "open");
    await page.getByText(owned.house.name).first().waitFor();
    await page.getByRole("button", { name: "פעולות" }).first().click();
    await page.getByRole("menuitem", { name: "ערוך בית" }).click();
    const quickButton = page.getByRole("button", { name: "עדכון מהיר" });
    if (!(await quickButton.isVisible())) {
      fail("EDIT-02 quick update should be available in rehearsal mode");
    } else {
      await quickButton.click();
      await page.locator(".house-edit-modal").getByRole("combobox").first().waitFor();
      await context.setOffline(true);
      const candySelect = page.locator(".house-edit-modal").getByRole("combobox").first();
      await candySelect.click();
      await page.getByRole("option", { name: "מעט" }).click();
      await page.locator(".house-edit-modal").getByRole("button", { name: "שמירה" }).click();
      await page.getByText("נשמר במכשיר · יישלח כשיש רשת").waitFor();
      const queued = await page.evaluate((houseId) => {
        const raw = localStorage.getItem("hw-pending-writes");
        const queue = raw ? JSON.parse(raw) : [];
        return Array.isArray(queue) && queue.some((item) => item.id === houseId);
      }, owned.house.id);
      if (!queued) fail("EDIT-02 offline quick update should queue a pending write");
      else pass("EDIT-02 offline quick update queues local save");
    }
    await context.setOffline(false);
    await adminDeleteHouse(owned.house.id);
  }

  await gotoPage(page, `${BASE}/?rehearsal=open`);
  await waitForCatalog(page);
  await page.getByRole("button", { name: "מאיפה למדוד מרחק" }).click();
  await page.getByRole("button", { name: "המיקום שלי" }).click();
  const gpsOrigin = await page.evaluate(() => {
    const raw =
      sessionStorage.getItem("hw-distance-origin") ?? localStorage.getItem("hw-distance-origin");
    return raw ? JSON.parse(raw) : null;
  });
  if (gpsOrigin?.kind !== "gps") fail("ORIGIN-02 should persist GPS origin choice");
  else pass("ORIGIN-02 origin picker saves GPS choice");

  await page.getByRole("button", { name: "מאיפה למדוד מרחק" }).click();
  await page.getByRole("button", { name: "בחירה על המפה" }).click();
  await page.getByRole("button", { name: "שמירת התחלה" }).waitFor();
  await page.getByRole("button", { name: "שמירת התחלה" }).click();
  const customOrigin = await page.waitForFunction(
    () => {
      const raw =
        sessionStorage.getItem("hw-distance-origin") ?? localStorage.getItem("hw-distance-origin");
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.kind === "custom" ? parsed : null;
    },
    null,
    { timeout: 10_000 },
  );
  if (!customOrigin) fail("ORIGIN-03 map-pick should persist custom origin");
  else pass("ORIGIN-03 map-pick saves custom origin");

  const multiUnitAddress = await page.evaluate(() => {
    const houses = JSON.parse(localStorage.getItem("hw-catalog-cache") ?? "{}").houses ?? [];
    const counts = new Map();
    for (const house of houses) counts.set(house.address, (counts.get(house.address) ?? 0) + 1);
    return [...counts.entries()].find(([, count]) => count > 1)?.[0] ?? null;
  });
  if (!multiUnitAddress) fail("MAP-03 could not find a multi-unit address in catalog");
  else {
    await gotoPage(page, `${BASE}/?rehearsal=open`);
    await waitForCatalog(page);
    await page.getByRole("button", { name: "מפה", exact: true }).click();
    const clusterPin = page.locator(".house-pin.is-building").first();
    if (!(await clusterPin.count())) {
      fail("MAP-03 map should render a multi-unit cluster pin");
    } else {
      try {
        await clusterPin.evaluate((el) => {
          el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        });
        await page
          .getByText(/בתים בכתובת זו|\d+ בתים/)
          .first()
          .waitFor({ timeout: 5000 });
        pass("MAP-03 cluster pin opens multi-unit address overview");
      } catch {
        fail("MAP-03 cluster pin should open multi-unit address overview");
      }
    }
  }

  const pollContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "he-IL",
  });
  const pollPage = await pollContext.newPage();
  try {
    await pollPage.clock.install();
    await gotoPage(pollPage, `${BASE}/?rehearsal=open`);
    await waitForCatalog(pollPage);
    const pollHouse = await createTestHouse();
    if (!pollHouse) {
      fail("OFF-06 could not create a poll test house");
    } else {
      const seeded = await pollPage.evaluate((houseId) => {
        const houses = JSON.parse(localStorage.getItem("hw-catalog-cache") ?? "{}").houses ?? [];
        return !houses.some((house) => house.id === houseId);
      }, pollHouse.house.id);
      if (!seeded) fail("OFF-06 poll test house should not be in cache before the poll tick");
      else {
        await pollPage.clock.fastForward(181_000);
        try {
          await pollPage.waitForFunction(
            (houseId) => {
              const houses = JSON.parse(localStorage.getItem("hw-catalog-cache") ?? "{}").houses ?? [];
              return houses.some((house) => house.id === houseId);
            },
            pollHouse.house.id,
            { timeout: 15_000 },
          );
          pass("OFF-06 catalog poll picks up server changes after interval");
        } catch {
          fail("OFF-06 catalog poll should refresh cached houses when online");
        }
      }
      await adminDeleteHouse(pollHouse.house.id);
    }
  } catch (error) {
    fail(`OFF-06 poll test crashed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await pollContext.close();
  }

  await page.screenshot({ path: `${OUT}/batch5.png`, fullPage: true });
  await context.close();
  await browser.close();

  if (failures) {
    console.error(`Batch-5 E2E failed (${failures} checks)`);
    process.exit(1);
  }
  console.log("PASS batch-5 E2E");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

// Ensure navigation errors fail the suite instead of exiting 0 silently.
process.on("unhandledRejection", (error) => {
  console.error(error);
  process.exit(1);
});
