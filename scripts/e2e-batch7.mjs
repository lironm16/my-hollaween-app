import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
/** Seed address that autocomplete knows (העמל 99 is API-only for isolated creates). */
const FORM_ADDRESS = "העמל 18";
import {
  firstRealHouseId,
  openHouseByFocus,
  waitForCatalog,
} from "./lib/e2e-helpers.mjs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43127";
const OUT = process.env.E2E_ARTIFACTS_DIR ?? join(process.cwd(), "artifacts", "e2e");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "pumpkin2026";
const IS_CI = process.env.CI === "true" || process.env.CI === "1";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let failures = 0;

function fail(message) {
  console.error("FAIL", message);
  failures += 1;
}

function pass(message) {
  console.log("ok", message);
}

function isCoordinateDestination(destination) {
  return /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(destination.trim());
}

function hasStreetText(destination) {
  return /[א-תA-Za-z]/.test(destination);
}

async function launchBrowser() {
  return chromium.launch({
    ...(IS_CI ? {} : { channel: "chrome" }),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
}

async function gotoPage(page, url, waitUntil = "domcontentloaded") {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(400);
    }
  }
}

async function fillVerifiedAddress(page, { name, address = FORM_ADDRESS }) {
  const addressField = page.getByRole("combobox");
  await addressField.click();
  await addressField.fill(address);
  const suggestion = page.getByRole("listbox").getByRole("button").first();
  await suggestion.waitFor({ timeout: 25_000 });
  await suggestion.click();
  await page.getByText("כתובת מאומתת על המפה").waitFor();
  await page.getByPlaceholder(/בית משפחת/).fill(name);
  await page.getByPlaceholder(/קומה|דירה|הוראות/).fill("קומה 1");
}

async function loginAdmin(page) {
  await gotoPage(page, `${BASE}/admin`);
  await page.getByRole("heading", { name: "כניסת מנהל" }).waitFor();
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "כניסה למפה" }).click();
  await page.getByText("נכנסתם כמנהלים").waitFor();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const photoPath = join(OUT, "decor-photo.png");
  writeFileSync(photoPath, TINY_PNG);

  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "he-IL",
    geolocation: { latitude: 32.0912, longitude: 34.8031 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);

  await gotoPage(page, `${BASE}/add`, "networkidle");
  await fillVerifiedAddress(page, { name: `בית batch7 ${Date.now()}` });
  await page.getByRole("button", { name: "לא מקושט" }).click();
  await page.getByRole("button", { name: "בלי ממתקים" }).click();
  await page.getByRole("button", { name: "שמירה" }).click();
  try {
    await page.getByText("סמנו לפחות קישוטים או ממתקים").waitFor({ timeout: 5000 });
    pass("ADD-03 add form blocks submit without decor or candy");
  } catch {
    fail("ADD-03 add form should show decor/candy validation toast");
  }

  await gotoPage(page, `${BASE}/add`, "networkidle");
  await fillVerifiedAddress(page, { name: `בית batch7 photo ${Date.now()}` });
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles(photoPath);
  try {
    await page.getByText("גררו את התמונה כדי לבחור את המרכז").waitFor({ timeout: 5000 });
    pass("EDIT-03 add form shows local photo preview before upload");
  } catch {
    fail("EDIT-03 add form should preview a selected decor photo");
  }

  await gotoPage(page, `${BASE}/?rehearsal=open`);
  await waitForCatalog(page);
  const houseMeta = await page.evaluate(() => {
    const houses = JSON.parse(localStorage.getItem("hw-catalog-cache") ?? "{}").houses ?? [];
    return (
      houses.find(
        (item) =>
          String(item.address ?? "").trim().length > 0 &&
          Number.isFinite(item.lat) &&
          Number.isFinite(item.lng) &&
          !/^בית-931\d$/.test(item.id) &&
          !String(item.description ?? "").includes("סטאב לחזרה"),
      ) ?? null
    );
  });
  const houseId = houseMeta?.id ?? null;
  if (!houseId) fail("ROUTE-05 could not pick a catalog house with address and coordinates");
  else {
    const detail = await openHouseByFocus(page, BASE, houseId);
    await detail.getByRole("button", { name: "פעולות" }).click();
    const nav = page.getByRole("menuitem", { name: "ניווט" });
    const href = await nav.getAttribute("href");
    if (!href) fail("ROUTE-05 navigation menu item should expose a maps href");
    else {
      const url = new URL(href);
      const destination = decodeURIComponent(url.searchParams.get("destination") ?? "");
      const street = String(houseMeta?.address ?? "").trim();
      const neighborhood = String(houseMeta?.neighborhood ?? "").trim();
      if (url.hostname !== "www.google.com") {
        fail(`ROUTE-05 maps link should target Google Maps (got ${url.hostname})`);
      } else if (url.searchParams.get("travelmode") !== "walking") {
        fail("ROUTE-05 maps link should use walking travel mode");
      } else if (!url.pathname.includes("/maps/dir")) {
        fail("ROUTE-05 maps link should open directions");
      } else if (!destination) {
        fail("ROUTE-05 maps link should include a destination");
      } else if (isCoordinateDestination(destination)) {
        fail(`ROUTE-05 maps destination must be street text, not coordinates (got "${destination}")`);
      } else if (!hasStreetText(destination)) {
        fail(`ROUTE-05 maps destination should include street text (got "${destination}")`);
      } else if (street && destination === neighborhood) {
        fail("ROUTE-05 maps destination should not be the neighborhood name alone");
      } else if (street && !destination.includes(street.split(",")[0].trim())) {
        fail(`ROUTE-05 maps destination should include the house street address (got "${destination}")`);
      } else if (street && !/רמת\s*גן/u.test(destination)) {
        fail(`ROUTE-05 maps destination should include city (got "${destination}")`);
      } else {
        pass("ROUTE-05 house actions expose Google Maps walking navigation with street text");
      }
    }
  }

  await gotoPage(page, `${BASE}/?rehearsal=open`);
  await waitForCatalog(page);
  await loginAdmin(page);
  await gotoPage(page, `${BASE}/admin/rehearsal`);
  await page.getByRole("heading", { name: "בדיקות" }).waitFor();
  const rehearsalSwitch = page.getByRole("switch").first();
  const enabled = await rehearsalSwitch.getAttribute("aria-checked");
  if (enabled !== "true") await rehearsalSwitch.click();
  await page.locator("select").first().selectOption("opensSoon");
  const scene = await page.evaluate(() => localStorage.getItem("hw-rehearsal-scene"));
  if (scene !== "opensSoon") fail(`ADM-05 rehearsal scene should persist (got ${scene ?? "null"})`);
  else pass("ADM-05 admin rehearsal panel enables a dry-run scene");

  await page.getByRole("button", { name: "השרת לא עונה" }).click();
  const serverSim = await page.evaluate(() => localStorage.getItem("hw-sim-server"));
  if (serverSim !== "down") fail("ADM-06 server-down toggle should set hw-sim-server=down");
  else pass("ADM-06 admin rehearsal panel toggles server-down simulation");

  await gotoPage(page, `${BASE}/?rehearsal=open`);
  try {
    await page.getByText(/השרת לא עונה/).first().waitFor({ timeout: 8000 });
    pass("ADM-06 server-down simulation shows the offline banner on the map");
  } catch {
    fail("ADM-06 server-down simulation should show the server-down banner");
  }

  await page.screenshot({ path: `${OUT}/batch7.png`, fullPage: true });
  await context.close();
  await browser.close();

  if (failures > 0) {
    console.error(`Batch-7 E2E failed (${failures} checks)`);
    process.exit(1);
  }
  console.log("PASS batch-7 E2E");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
