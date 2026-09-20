import { config } from "@/lib/config";
import { toPublicHouse } from "@/lib/ids";
import { isPubliclyListed } from "@/lib/house-state";
import { mergePushTemplates, PUSH_KINDS } from "@/lib/push-templates";
import type { Catalog, DbFile, House, PublicHouse } from "@/lib/types";

/** Build a public catalog payload from house rows (shared by store + snapshot publish). */
export function asCatalogForSnapshot(
  houses: House[],
  updatedAt: string,
  pushSettings?: DbFile["pushSettings"],
): Catalog {
  const published: PublicHouse[] = houses
    .filter((h) => isPubliclyListed(h))
    .map((h) => toPublicHouse(h));
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
    pushTemplates,
  };
}
