import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(readFileSync(join(root, "data/seed.json"), "utf8"));
const STUB_ID = /^בית-931\d$/;
function isStub(house) {
  if (house.id && STUB_ID.test(house.id)) return true;
  return Boolean(house.description?.includes("סטאב לחזרה"));
}
const houses = seed.houses
  .filter((h) => h.status === "approved" && !isStub(h))
  .map((h) => {
    const house = { ...h };
    delete house.editCode;
    delete house.rejectionReason;
    return house;
  });

const catalog = {
  updatedAt: seed.updatedAt,
  neighborhood: process.env.NEXT_PUBLIC_NEIGHBORHOOD_NAME ?? "שיכון ותיקים · חרוזים · נחלת גנים",
  houses,
};

writeFileSync(join(root, "public/catalog.json"), JSON.stringify(catalog));
console.log(`wrote public/catalog.json (${houses.length} houses)`);
