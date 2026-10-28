import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { streetFromLegacyAddress } from "@/lib/address-fields";
import { parseStreetAndNumber } from "@/lib/address-text";
import { namedPlaceForCampusAddress } from "@/lib/named-address-places";

const REPO_ROOT = join(process.cwd());

function readJsonHouses(relPath: string): { address?: string }[] {
  const path = join(REPO_ROOT, relPath);
  if (!existsSync(path)) return [];
  const json = JSON.parse(readFileSync(path, "utf8")) as { houses?: { address?: string }[] };
  return json.houses ?? [];
}

function roadsFromFootprints(): string[] {
  const path = join(REPO_ROOT, "public/osm-building-footprints.json");
  if (!existsSync(path)) return [];
  const json = JSON.parse(readFileSync(path, "utf8")) as {
    footprints?: Record<string, unknown>;
  };
  return Object.keys(json.footprints ?? {}).map((key) => key.split("#")[0]?.trim() ?? "").filter(Boolean);
}

function roadFromAddress(address: string): string | null {
  const street = streetFromLegacyAddress(address.trim());
  if (!street || namedPlaceForCampusAddress(street)) return null;
  const { road } = parseStreetAndNumber(street);
  const r = road.trim();
  return r || null;
}

/** Every distinct Hebrew road name used in catalogs, seeds, and OSM footprint keys. */
export function collectEventStreetRoads(extraCatalogPaths: string[] = []): string[] {
  const roads = new Set<string>();
  const catalogFiles = [
    "data/seed.json",
    "data/gem-live-catalog.json",
    "public/catalog.json",
    ...extraCatalogPaths,
  ];
  for (const file of catalogFiles) {
    for (const house of readJsonHouses(file)) {
      const road = roadFromAddress(house.address ?? "");
      if (road) roads.add(road);
    }
  }
  for (const road of roadsFromFootprints()) {
    roads.add(road);
  }
  return [...roads].sort((a, b) => a.localeCompare(b, "he"));
}
