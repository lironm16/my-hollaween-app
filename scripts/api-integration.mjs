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

async function main() {
  mkdirSync("artifacts", { recursive: true });
  await testCatalog();
  const adminCookie = await testAdminAuth();
  if (adminCookie) {
    await testHouseCreate(adminCookie);
    await testHouseUnlock(adminCookie);
    await testAdminFreeze(adminCookie);
    await testAdminExport(adminCookie);
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
