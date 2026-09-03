import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43127";
const OUT = "/opt/cursor/artifacts";

function fail(message) {
  console.error("FAIL", message);
  process.exitCode = 1;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "he-IL",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.on("pageerror", (err) => console.log("pageerror", err.message));

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
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

  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem("hw-catalog-cache");
    const catalog = raw ? JSON.parse(raw) : null;
    return {
      count: catalog?.houses?.length ?? 0,
      names: (catalog?.houses ?? []).map((h) => h.name).slice(0, 3),
    };
  });
  console.log("saved", saved);
  if (!saved || saved.count < 1) fail("catalog was not written to localStorage");

  await page.getByRole("button", { name: "רשימה" }).click();
  await page.getByPlaceholder("חיפוש לפי שם או רחוב…").waitFor();
  const firstName = saved.names[0];
  if (firstName) await page.getByText(firstName).first().waitFor();
  await page.screenshot({ path: `${OUT}/houses-saved-on-device.png`, fullPage: true });

  await page.route("**/api/catalog**", (route) => route.abort("failed"));
  await page.route("**/catalog.json**", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "רענון" }).click();
  await page.getByText("השרת לא עונה").first().waitFor();
  if (firstName) await page.getByText(firstName).first().waitFor();
  await page.screenshot({ path: `${OUT}/server-down-keeps-houses.png`, fullPage: true });
  console.log("server-down still showing", saved.count, "houses");

  await context.setOffline(true);
  await page.getByRole("button", { name: "רענון" }).click();
  await page.getByText("לא מקוון").first().waitFor();
  if (firstName) await page.getByText(firstName).first().waitFor();
  await page.screenshot({ path: `${OUT}/no-internet-keeps-houses.png`, fullPage: true });
  console.log("no-internet still showing the saved list");

  await context.setOffline(false);
  await page.unroute("**/api/catalog**");
  await page.unroute("**/catalog.json**");
  await page.goto(BASE + "/offline.html", { waitUntil: "domcontentloaded" });
  await page.getByText(/בתים שמורים במכשיר/).waitFor();
  await page.screenshot({ path: `${OUT}/offline-html-saved-list.png`, fullPage: true });
  console.log("offline.html listed saved houses");

  await browser.close();
  if (process.exitCode) {
    console.error("offline catalog check failed");
    return;
  }
  console.log("PASS saved list survives server-down and no-internet");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
