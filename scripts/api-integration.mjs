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
  return { res, data };
}

function validHousePayload(name = "בית אינטגרציה") {
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
  };
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

  return adminCookie;
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

  const created = await json("POST", "/api/houses", validHousePayload());
  if (!created.res.ok || !created.data.house?.id || !created.data.editCode) {
    return fail("POST /api/houses valid payload should return house + editCode");
  }
  pass(`POST /api/houses creates ${created.data.house.id}`);

  const listed = await json("GET", "/api/catalog");
  const found = listed.data.houses?.some((house) => house.id === created.data.house.id);
  if (!found) return fail("created house should appear in catalog");
  pass("created house appears in catalog");

  const removed = await json("DELETE", `/api/admin/houses/${encodeURIComponent(created.data.house.id)}`, null, {
    Cookie: adminCookie,
  });
  if (!removed.res.ok || removed.data.ok !== true) {
    return fail("admin DELETE should remove created test house");
  }
  pass("admin deletes created test house");
}

async function main() {
  mkdirSync("artifacts", { recursive: true });
  await testCatalog();
  const adminCookie = await testAdminAuth();
  if (adminCookie) await testHouseCreate(adminCookie);

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
