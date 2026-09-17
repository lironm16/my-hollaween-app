export async function waitForCatalog(page) {
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

export async function firstRealHouseId(page) {
  return page.evaluate(() => {
    const houses = JSON.parse(localStorage.getItem("hw-catalog-cache") ?? "{}").houses ?? [];
    const house = houses.find(
      (item) =>
        !/^בית-931\d$/.test(item.id) &&
        !String(item.description ?? "").includes("סטאב לחזרה"),
    );
    return house?.id ?? houses[0]?.id ?? null;
  });
}

export async function readStorageIds(page, key) {
  return page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids : [];
  }, key);
}

/** Skip a house from the detail dialog — handles direct skip or the confirmation modal. */
export async function skipHouseFromDetail(page, detail) {
  const skippedBefore = await readStorageIds(page, "hw-skipped-houses");
  await detail.getByRole("button", { name: "פעולות" }).click();
  await page.getByRole("menuitem", { name: "דילוג על בית" }).click();
  const modal = page.locator(".house-edit-modal");
  if (await modal.count()) {
    await modal.getByRole("button", { name: /^אישור$/ }).click();
  }
  await page.waitForFunction(
    (before) => {
      const raw = localStorage.getItem("hw-skipped-houses");
      const ids = raw ? JSON.parse(raw) : [];
      return ids.some((id) => !before.includes(id));
    },
    skippedBefore,
  );
  const skippedAfter = await readStorageIds(page, "hw-skipped-houses");
  return { skippedBefore, skippedAfter };
}

export async function openHouseByFocus(page, baseUrl, houseId) {
  const url = `${baseUrl}/?focus=${encodeURIComponent(houseId)}&rehearsal=open`;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await waitForCatalog(page);
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      return dialog;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(400);
    }
  }
  throw lastError;
}
