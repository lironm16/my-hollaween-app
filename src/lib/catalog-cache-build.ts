import { publicHouseForCatalog } from "@/lib/address-reveal";
import { config } from "@/lib/config";
import { addressRevealScheduleFromDb, catalogEventSettings } from "@/lib/event-settings";
import { toPublicHouse } from "@/lib/ids";
import { isPubliclyListed } from "@/lib/house-state";
import { mergePushTemplates, PUSH_KINDS } from "@/lib/push-templates";
import type { Catalog, DbFile, House, PublicHouse } from "@/lib/types";

/** Published locations in the catalog (houses + POIs, excluding hidden rows). */
export function countPublishedHouses(houses: House[]): number {
  return houses.filter((house) => isPubliclyListed(house)).length;
}

/** Admin export / tools — full addresses before public reveal time. */
export function asCatalogForAdmin(
  houses: House[],
  updatedAt: string,
  pushSettings?: DbFile["pushSettings"],
  eventSettings?: DbFile["eventSettings"],
): Catalog {
  const published: PublicHouse[] = houses
    .filter((h) => isPubliclyListed(h))
    .map((h) => toPublicHouse(h) as PublicHouse);
  const merged = mergePushTemplates(pushSettings);
  const pushTemplates: Catalog["pushTemplates"] = {};
  for (const id of PUSH_KINDS) {
    pushTemplates[id] = {
      enabled: merged[id].enabled,
      title: merged[id].title,
      body: merged[id].body,
    };
  }
  return {
    updatedAt,
    neighborhood: config.neighborhood,
    houses: published,
    houseCount: published.length,
    pushTemplates,
    eventSettings: catalogEventSettings(eventSettings),
  };
}

/** Build a public catalog payload from house rows (shared by store + snapshot publish). */
export function asCatalogForSnapshot(
  houses: House[],
  updatedAt: string,
  pushSettings?: DbFile["pushSettings"],
  eventSettings?: DbFile["eventSettings"],
): Catalog {
  const catalogNow = new Date();
  const revealSchedule = addressRevealScheduleFromDb(eventSettings);
  const published: PublicHouse[] = houses
    .filter((h) => isPubliclyListed(h))
    .map((h) => publicHouseForCatalog(toPublicHouse(h) as PublicHouse, catalogNow, revealSchedule));
  const merged = mergePushTemplates(pushSettings);
  const pushTemplates: Catalog["pushTemplates"] = {};
  for (const id of PUSH_KINDS) {
    pushTemplates[id] = {
      enabled: merged[id].enabled,
      title: merged[id].title,
      body: merged[id].body,
    };
  }
  return {
    updatedAt,
    neighborhood: config.neighborhood,
    houses: published,
    houseCount: published.length,
    pushTemplates,
    eventSettings: catalogEventSettings(eventSettings),
  };
}
