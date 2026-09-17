/** Isolated E2E house payloads — never use seed multi-unit addresses like חרוזים 8. */

export const E2E_HOUSE_ADDRESS = "העמל 99";
export const E2E_HOUSE_LAT = 32.09012;
export const E2E_HOUSE_LNG = 34.80355;

export function e2eHousePayload(name = "בית בדיקה E2E", patch = {}) {
  return {
    name,
    theme: "pumpkin",
    address: E2E_HOUSE_ADDRESS,
    arrival: "קומה 1",
    description: "בדיקת E2E — לא בית אמיתי",
    lat: E2E_HOUSE_LAT,
    lng: E2E_HOUSE_LNG,
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

export async function createE2eHouse(baseUrl, name, patch = {}) {
  const res = await fetch(`${baseUrl}/api/houses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(e2eHousePayload(name, patch)),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.house?.id || !data.editCode) return null;
  return data;
}

export async function adminDeleteHouse(baseUrl, houseId, password = "pumpkin2026") {
  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const cookie = login.headers.getSetCookie?.()?.[0]?.split(";")[0] ?? "";
  if (!cookie) return false;
  const removed = await fetch(`${baseUrl}/api/admin/houses/${encodeURIComponent(houseId)}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  return removed.ok;
}
