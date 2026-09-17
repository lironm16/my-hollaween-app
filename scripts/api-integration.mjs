import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43128";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "pumpkin2026";

let failures = 0;

function fail(message) {
  console.error("FAIL", message);
  failures += 1;
}

function pass(message) {
  console.log("ok", message);
}

function cookieHeader(response) {
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length) return cookies.map((entry) => entry.split(";")[0]).join("; ");
  const single = response.headers.get("set-cookie");
  return single ? single.split(";")[0] : "";
}

async function json(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data, text };
}

function validHousePayload(name = "בית אינטגרציה", patch = {}) {
  return {
    name,
    theme: "pumpkin",
    address: "חרוזים 8",
    arrival: "קומה 1",
    description: "בדיקת API",
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
    ...patch,
  };
}

async function createHouse(patch = {}) {
  const created = await json("POST", "/api/houses", validHousePayload(undefined, patch));
  if (!created.res.ok || !created.data.house?.id || !created.data.editCode) {
    fail("POST /api/houses valid payload should return house + editCode");
    return null;
  }
  return created.data;
}

async function deleteHouse(adminCookie, id) {
  const removed = await json("DELETE", `/api/admin/houses/${encodeURIComponent(id)}`, null, {
    Cookie: adminCookie,
  });
  if (!removed.res.ok || removed.data.ok !== true) {
    fail(`admin DELETE should remove test house ${id}`);
  }
}

async function testCatalog() {
  const { res, data } = await json("GET", "/api/catalog");
  if (!res.ok) return fail("GET /api/catalog should return 200");
  if (!Array.isArray(data.houses) || data.houses.length < 1) {
    return fail("GET /api/catalog should include houses[]");
  }
  if (!res.headers.get("content-type")?.includes("application/json")) {
    return fail("GET /api/catalog should set JSON content-type");
  }
  if (!res.headers.get("x-catalog-poll-seconds")) {
    return fail("GET /api/catalog should set X-Catalog-Poll-Seconds");
  }
  if (typeof data.pollSeconds !== "number") {
    return fail("GET /api/catalog body should include pollSeconds");
  }
  pass("GET /api/catalog returns catalog JSON with poll headers");

  const delta = await json("GET", "/api/catalog?since=not-a-date");
  if (!delta.res.ok) return fail("GET /api/catalog?since=… should return 200");
  if (!Array.isArray(delta.data.houses)) return fail("catalog delta should include houses[]");
  pass("GET /api/catalog?since=… returns a delta payload");
}

async function testAdminAuth() {
  const guest = await json("GET", "/api/admin/session");
  if (!guest.res.ok || guest.data.admin !== false) {
    return fail("GET /api/admin/session without cookie should be admin:false");
  }
  pass("guest admin session is false");

  const bad = await json("POST", "/api/admin/login", { password: "wrong-password" });
  if (bad.res.status === 503) {
    return fail("admin login is disabled — set ADMIN_PASSWORD on the test server");
  }
  if (bad.res.status !== 401) return fail(`wrong admin password should return 401 (got ${bad.res.status})`);
  pass("admin login rejects wrong password");

  const good = await json("POST", "/api/admin/login", { password: ADMIN_PASSWORD });
  if (!good.res.ok || good.data.ok !== true) return fail("admin login should succeed");
  const adminCookie = cookieHeader(good.res);
  if (!adminCookie.includes("hw_admin=")) return fail("admin login should set hw_admin cookie");
  pass("admin login succeeds with cookie");

  const session = await json("GET", "/api/admin/session", null, { Cookie: adminCookie });
  if (!session.res.ok || session.data.admin !== true) {
    return fail("GET /api/admin/session with cookie should be admin:true");
  }
  pass("admin session is true after login");

  const logout = await json("POST", "/api/admin/logout", null, { Cookie: adminCookie });
  if (!logout.res.ok || logout.data.ok !== true) return fail("admin logout should succeed");
  const afterLogout = await json("GET", "/api/admin/session");
  if (!afterLogout.res.ok || afterLogout.data.admin !== false) {
    return fail("admin session should be false after logout");
  }
  pass("admin logout clears session");

  const loginAgain = await json("POST", "/api/admin/login", { password: ADMIN_PASSWORD });
  if (!loginAgain.res.ok) return fail("admin re-login should succeed after logout");
  return cookieHeader(loginAgain.res);
}

async function testHouseCreate(adminCookie) {
  const invalid = await json("POST", "/api/houses", {
    ...validHousePayload("בית מחוץ לשכונה"),
    lat: 32.05,
    lng: 34.7,
  });
  if (invalid.res.status !== 400 || invalid.data.code !== "VALIDATION") {
    return fail("POST /api/houses out of bounds should return 400 VALIDATION");
  }
  pass("POST /api/houses rejects out-of-bounds coordinates");

  const decorOnly = await createHouse({
    treats: [],
    treatStock: {},
    decorLevel: "medium",
    decorated: true,
  });
  if (decorOnly) {
    pass("POST /api/houses accepts decor-only house");
    await deleteHouse(adminCookie, decorOnly.house.id);
  }

  const candyOnly = await createHouse({
    decorLevel: "none",
    decorated: false,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
  });
  if (candyOnly) {
    pass("POST /api/houses accepts candy-only house");
    await deleteHouse(adminCookie, candyOnly.house.id);
  }

  const created = await createHouse();
  if (!created) return null;
  pass(`POST /api/houses creates ${created.house.id}`);

  const listed = await json("GET", "/api/catalog");
  const found = listed.data.houses?.some((house) => house.id === created.house.id);
  if (!found) return fail("created house should appear in catalog");
  pass("created house appears in catalog");

  await deleteHouse(adminCookie, created.house.id);
  pass("admin deletes created test house");

  const afterDelete = await json("GET", "/api/catalog");
  if (afterDelete.data.houses?.some((house) => house.id === created.house.id)) {
    fail("ADM-04 deleted house should not appear in public catalog");
  } else {
    pass("ADM-04 admin delete removes house from catalog");
  }

  return created;
}

async function testHouseUnlock(adminCookie) {
  const created = await createHouse();
  if (!created) return;
  const id = created.house.id;

  const wrong = await json("POST", `/api/houses/${encodeURIComponent(id)}/unlock`, {
    editCode: "000000",
  });
  if (wrong.res.status !== 403) return fail("unlock with wrong edit code should return 403");
  pass("unlock rejects wrong edit code");

  const right = await json("POST", `/api/houses/${encodeURIComponent(id)}/unlock`, {
    editCode: created.editCode,
  });
  if (!right.res.ok || right.data.house?.id !== id) {
    return fail("unlock with correct edit code should return the house");
  }
  pass("unlock accepts correct edit code");

  await deleteHouse(adminCookie, id);
}

async function testAdminFreeze(adminCookie) {
  const created = await createHouse();
  if (!created) return;
  const id = created.house.id;

  const frozen = await json(
    "PATCH",
    `/api/admin/houses/${encodeURIComponent(id)}`,
    { adminFrozen: true },
    { Cookie: adminCookie },
  );
  if (!frozen.res.ok || frozen.data.house?.adminFrozen !== true) {
    return fail("admin PATCH should freeze a house");
  }
  pass("admin freeze sets adminFrozen on house");

  const adminList = await json("GET", "/api/admin/houses", null, { Cookie: adminCookie });
  const listed = adminList.data.houses?.find((house) => house.id === id);
  if (!listed?.adminFrozen) return fail("frozen house should appear as adminFrozen in admin list");
  pass("admin list shows frozen house");

  await deleteHouse(adminCookie, id);
}

async function testAdminExport(adminCookie) {
  const csv = await fetch(`${BASE}/api/admin/export?format=csv`, {
    headers: { Cookie: adminCookie },
    cache: "no-store",
  });
  if (!csv.ok) return fail("admin CSV export should return 200");
  const type = csv.headers.get("content-type") ?? "";
  if (!type.includes("text/csv")) return fail("admin CSV export should use text/csv content-type");
  const body = await csv.text();
  if (!body.includes("שם") || !body.includes("ממתקים")) {
    return fail("admin CSV export should include Hebrew headers");
  }
  pass("admin CSV export returns Hebrew CSV");
}

function fakePushSubscription(endpoint = "https://fcm.googleapis.com/fcm/send/test-e2e-endpoint") {
  return {
    endpoint,
    keys: {
      p256dh: "BEl62iUYgUivxIkv69yViEuiBIa-Ib37g8",
      auth: "tBHIOTTzQAmpzlnb",
    },
  };
}

async function testPushApi() {
  const key = await json("GET", "/api/push/public-key");
  if (!key.res.ok || typeof key.data.publicKey !== "string" || key.data.publicKey.length < 20) {
    return fail("GET /api/push/public-key should return a VAPID publicKey");
  }
  pass("GET /api/push/public-key returns VAPID key");

  const bad = await json("POST", "/api/push/subscribe", { endpoint: "not-valid" });
  if (bad.res.status !== 400) return fail("POST /api/push/subscribe invalid body should return 400");
  pass("POST /api/push/subscribe rejects invalid subscription");

  const sub = fakePushSubscription();
  const saved = await json("POST", "/api/push/subscribe", sub);
  if (!saved.res.ok || saved.data.ok !== true || typeof saved.data.count !== "number") {
    return fail("POST /api/push/subscribe should save a valid subscription");
  }
  pass("POST /api/push/subscribe saves subscription");

  const status = await json(
    "GET",
    `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
  );
  if (!status.res.ok || status.data.registered !== true || typeof status.data.total !== "number") {
    return fail("GET /api/push/subscribe?endpoint=… should report registered subscription");
  }
  pass("GET /api/push/subscribe reports registered endpoint");

  const unsub = await json("POST", "/api/push/unsubscribe", { endpoint: sub.endpoint });
  if (!unsub.res.ok || unsub.data.ok !== true) {
    return fail("POST /api/push/unsubscribe should remove a subscription");
  }
  pass("POST /api/push/unsubscribe removes subscription");

  const afterUnsub = await json(
    "GET",
    `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
  );
  if (!afterUnsub.res.ok || afterUnsub.data.registered !== false) {
    return fail("GET /api/push/subscribe should report unregistered endpoint after unsubscribe");
  }
  pass("GET /api/push/subscribe reports unregistered endpoint");

  const missingEndpoint = await json("POST", "/api/push/test", {});
  if (missingEndpoint.res.status !== 400) {
    return fail("POST /api/push/test without endpoint should return 400");
  }
  pass("POST /api/push/test rejects missing endpoint");

  const unknownEndpoint = await json("POST", "/api/push/test", {
    endpoint: "https://fcm.googleapis.com/fcm/send/not-registered-batch5",
  });
  if (unknownEndpoint.res.status !== 404 || unknownEndpoint.data.registered !== false) {
    return fail("POST /api/push/test should return 404 for unknown endpoint");
  }
  pass("POST /api/push/test reports unknown endpoint");
}

async function testWalkRouteApi() {
  const tooFew = await json("POST", "/api/walk-route", {
    points: [{ lat: 32.09, lng: 34.8 }],
  });
  if (tooFew.res.status !== 400) return fail("POST /api/walk-route with <2 points should return 400");
  pass("POST /api/walk-route rejects fewer than two points");

  const route = await json("POST", "/api/walk-route", {
    points: [
      { lat: 32.0916477, lng: 34.8028691 },
      { lat: 32.089223, lng: 34.804374 },
    ],
  });
  if (!route.res.ok) return fail("POST /api/walk-route with two points should return 200");
  const line = route.data.line;
  if (line !== null && !Array.isArray(line)) {
    return fail("POST /api/walk-route should return line null or coordinate array");
  }
  pass("POST /api/walk-route accepts two points (line null or geometry array)");
}

async function testOwnerEdit(adminCookie) {
  const created = await createHouse();
  if (!created) return;
  const { house, editCode } = created;
  const id = house.id;

  const wrongPatch = await json("PATCH", `/api/houses/${encodeURIComponent(id)}`, {
    editCode: "000000",
    visit: "closed",
  });
  if (wrongPatch.res.status !== 403) return fail("EDIT-01 PATCH with wrong edit code should return 403");
  pass("EDIT-01 owner PATCH rejects wrong edit code");

  const patched = await json("PATCH", `/api/houses/${encodeURIComponent(id)}`, {
    editCode,
    treatStock: { candy: "low" },
    visit: "come",
  });
  if (!patched.res.ok || patched.data.house?.treatStock?.candy !== "low") {
    return fail("EDIT-01 owner PATCH with edit code should update treat stock");
  }
  pass("EDIT-01 owner quick update saves with edit code");

  const wrongDelete = await json("DELETE", `/api/houses/${encodeURIComponent(id)}`, {
    editCode: "000000",
  });
  if (wrongDelete.res.status !== 403) return fail("EDIT-04 owner DELETE with wrong edit code should return 403");
  pass("EDIT-04 owner DELETE rejects wrong edit code");

  const removed = await json("DELETE", `/api/houses/${encodeURIComponent(id)}`, { editCode });
  if (!removed.res.ok || removed.data.ok !== true) {
    return fail("EDIT-04 owner DELETE with edit code should remove the house");
  }
  pass("EDIT-04 owner DELETE removes house with edit code");

  const catalog = await json("GET", "/api/catalog");
  if (catalog.data.houses?.some((item) => item.id === id)) {
    return fail("EDIT-04 deleted house should not appear in catalog");
  }
  pass("EDIT-04 owner delete removes house from catalog");
}

async function testAddressApi() {
  const short = await json("GET", "/api/address?q=a");
  if (!short.res.ok || !Array.isArray(short.data.hits) || short.data.hits.length !== 0) {
    return fail("GET /api/address?q=… with short query should return hits:[]");
  }
  pass("GET /api/address returns empty hits for short query");

  const search = await json("GET", `/api/address?q=${encodeURIComponent("חרוזים")}`);
  if (search.res.status === 503) {
    pass("GET /api/address degrades gracefully when geocoder is unavailable");
    return;
  }
  if (!search.res.ok || !Array.isArray(search.data.hits)) {
    return fail("GET /api/address should return hits[] when geocoder is available");
  }
  pass("GET /api/address returns hits array for neighborhood query");
}

async function testHouseNotify(adminCookie) {
  const created = await createHouse();
  if (!created) return;
  const { house, editCode } = created;
  const id = house.id;

  const badKind = await json("POST", `/api/houses/${encodeURIComponent(id)}/notify`, {
    editCode,
    kind: "not-a-kind",
  });
  if (badKind.res.status !== 400) return fail("house notify should reject unknown kind");
  pass("house notify rejects unknown kind");

  const noCode = await json("POST", `/api/houses/${encodeURIComponent(id)}/notify`, {
    kind: "candyLow",
  });
  if (noCode.res.status !== 401) return fail("house notify should require edit code for guests");
  pass("house notify requires edit code for guests");

  const autoKind = await json("POST", `/api/houses/${encodeURIComponent(id)}/notify`, {
    editCode,
    kind: "houseAdded",
  });
  if (autoKind.res.status !== 400) return fail("house notify should reject auto-only kinds");
  pass("house notify rejects auto-only kinds");

  await deleteHouse(adminCookie, id);
}

async function testPhotoApi(adminCookie) {
  const created = await createHouse();
  if (!created) return;
  const { house, editCode } = created;
  const id = house.id;

  const badImage = await json("POST", `/api/houses/${encodeURIComponent(id)}/photo`, {
    editCode,
    image: "not-a-jpeg",
  });
  if (badImage.res.status !== 400) return fail("photo upload should reject non-JPEG data URLs");
  pass("photo upload rejects invalid image payload");

  const wrongCode = await json("POST", `/api/houses/${encodeURIComponent(id)}/photo`, {
    editCode: "000000",
    image: "data:image/jpeg;base64,abcd",
  });
  if (wrongCode.res.status !== 400 && wrongCode.res.status !== 403) {
    return fail("photo upload should reject wrong edit code or invalid JPEG");
  }
  pass("photo upload validates edit code / payload");

  await deleteHouse(adminCookie, id);
}

async function testAdminExtended(adminCookie) {
  const guestStats = await json("GET", "/api/admin/stats");
  if (guestStats.res.status !== 401) return fail("GET /api/admin/stats without cookie should return 401");
  pass("ADM-07 guest cannot read admin stats");

  const stats = await json("GET", "/api/admin/stats", null, { Cookie: adminCookie });
  if (!stats.res.ok || typeof stats.data.houses !== "number") {
    return fail("GET /api/admin/stats should return snapshot counts");
  }
  pass("ADM-07 admin stats returns snapshot counts");

  const guestList = await json("GET", "/api/admin/houses");
  if (guestList.res.status !== 401) return fail("GET /api/admin/houses without cookie should return 401");
  const list = await json("GET", "/api/admin/houses", null, { Cookie: adminCookie });
  if (!list.res.ok || !Array.isArray(list.data.houses)) {
    return fail("GET /api/admin/houses should return houses[]");
  }
  pass("admin houses list returns full house records");

  const created = await createHouse();
  if (!created) return;
  const id = created.house.id;

  const adminPatch = await json(
    "PATCH",
    `/api/admin/houses/${encodeURIComponent(id)}`,
    { treatStock: { candy: "low" } },
    { Cookie: adminCookie },
  );
  if (!adminPatch.res.ok || adminPatch.data.house?.treatStock?.candy !== "low") {
    return fail("ADM-02 admin PATCH should update without edit code");
  }
  pass("ADM-02 admin PATCH updates house without edit code");

  const badPush = await json(
    "POST",
    "/api/admin/push",
    { title: "", body: "" },
    { Cookie: adminCookie },
  );
  if (badPush.res.status !== 400) return fail("admin broadcast push should require title and body");
  pass("admin broadcast push rejects empty payload");

  const push = await json(
    "POST",
    "/api/admin/push",
    { title: "בדיקה", body: "הודעת בדיקה" },
    { Cookie: adminCookie },
  );
  if (!push.res.ok || push.data.ok !== true) return fail("admin broadcast push should accept title and body");
  pass("admin broadcast push accepts title and body");

  const templates = await json("GET", "/api/admin/push/templates", null, { Cookie: adminCookie });
  if (!templates.res.ok || !Array.isArray(templates.data.templates)) {
    return fail("GET /api/admin/push/templates should return templates[]");
  }
  pass("admin push templates list returns templates");

  const saveTemplates = await json(
    "PUT",
    "/api/admin/push/templates",
    {
      templates: [{ id: "candyLow", enabled: true, title: "מעט ממתקים", body: "בדיקה" }],
    },
    { Cookie: adminCookie },
  );
  if (!saveTemplates.res.ok || saveTemplates.data.ok !== true) {
    return fail("PUT /api/admin/push/templates should save template changes");
  }
  pass("admin push templates PUT saves changes");

  const resetTemplates = await json("POST", "/api/admin/push/templates/reset", null, {
    Cookie: adminCookie,
  });
  if (!resetTemplates.res.ok || resetTemplates.data.ok !== true) {
    return fail("POST /api/admin/push/templates/reset should restore defaults");
  }
  pass("admin push templates reset restores defaults");

  await deleteHouse(adminCookie, id);
}

async function main() {
  mkdirSync("artifacts", { recursive: true });
  await testCatalog();
  const adminCookie = await testAdminAuth();
  await testPushApi();
  await testWalkRouteApi();
  await testAddressApi();
  if (adminCookie) {
    await testHouseCreate(adminCookie);
    await testHouseUnlock(adminCookie);
    await testAdminFreeze(adminCookie);
    await testAdminExport(adminCookie);
    await testOwnerEdit(adminCookie);
    await testHouseNotify(adminCookie);
    await testPhotoApi(adminCookie);
    await testAdminExtended(adminCookie);
  }

  if (failures) {
    console.error(`API integration failed (${failures} checks)`);
    process.exit(1);
  }
  console.log("PASS API integration");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
