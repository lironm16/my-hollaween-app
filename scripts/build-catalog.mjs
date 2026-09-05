import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(readFileSync(join(root, "data/seed.json"), "utf8"));
const houses = seed.houses
  .filter((h) => {
    if (h.status !== "approved") return false;
    if (h.id === "בית-9316") return true;
    if (h.adminFrozen) return false;
    if (h.ownerFrozenUntil && Date.parse(h.ownerFrozenUntil) > Date.now()) return false;
    return true;
  })
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
