import { promises as fs } from "node:fs";
import path from "node:path";
import { get as getBlob, put as putBlob } from "@vercel/blob";
import { asCatalogForSnapshot } from "@/lib/catalog-cache-build";
import {
  blobConfigured,
  privateBlobGetOptions,
  privateBlobPutOptions,
} from "@/lib/blob-auth";
import type { Catalog, DbFile, House } from "@/lib/types";

const CATALOG_BLOB_PATH = "halloween-houses/catalog-snapshot.json";
const PUBLIC_CATALOG_PATH = path.join(process.cwd(), "public", "catalog.json");

export type CatalogSnapshot = {
  updatedAt: string;
  houses: House[];
  pushSettings?: DbFile["pushSettings"];
  /** Public catalog mirror — used for client snapshot routes. */
  catalog: Catalog;
};

function stamp(value?: string) {
  const n = Date.parse(value ?? "");
  return Number.isFinite(n) ? n : 0;
}

async function readPublicCatalogFallback(): Promise<CatalogSnapshot | null> {
  try {
    const raw = await fs.readFile(PUBLIC_CATALOG_PATH, "utf8");
    const catalog = JSON.parse(raw) as Catalog;
    if (!catalog?.updatedAt || !Array.isArray(catalog.houses)) return null;
    return {
      updatedAt: catalog.updatedAt,
      houses: catalog.houses as unknown as House[],
      catalog,
    };
  } catch {
    return null;
  }
}

/** Shared cross-instance catalog snapshot (Vercel Blob), with static fallback. */
export async function readSharedCatalogSnapshot(
  minUpdatedAt?: string,
): Promise<CatalogSnapshot | null> {
  let snap: CatalogSnapshot | null = null;

  if (blobConfigured()) {
    try {
      const result = await getBlob(CATALOG_BLOB_PATH, privateBlobGetOptions());
      if (result?.stream) {
        snap = JSON.parse(await new Response(result.stream).text()) as CatalogSnapshot;
      }
    } catch {
      snap = null;
    }
  }

  if (!snap) snap = await readPublicCatalogFallback();
  if (!snap) return null;
  if (minUpdatedAt && stamp(snap.updatedAt) < stamp(minUpdatedAt)) return null;
  return snap;
}

/** Publish catalog snapshot after house/catalog writes — Blob + best-effort public file. */
export async function publishCatalogSnapshot(db: DbFile): Promise<void> {
  const houses = db.houses ?? [];
  const catalog = asCatalogForSnapshot(houses, db.updatedAt, db.pushSettings);
  const payload: CatalogSnapshot = {
    updatedAt: db.updatedAt,
    houses,
    ...(db.pushSettings?.templates ? { pushSettings: db.pushSettings } : {}),
    catalog,
  };
  const json = JSON.stringify(payload);

  if (blobConfigured()) {
    try {
      await putBlob(CATALOG_BLOB_PATH, json, privateBlobPutOptions("application/json"));
    } catch (error) {
      console.error("[catalog-cache] blob publish failed", error);
    }
  }

  try {
    await fs.mkdir(path.dirname(PUBLIC_CATALOG_PATH), { recursive: true });
    const tmp = `${PUBLIC_CATALOG_PATH}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(catalog));
    await fs.rename(tmp, PUBLIC_CATALOG_PATH);
  } catch {
    /* read-only FS on serverless — blob is the durable mirror */
  }
}

export function catalogSnapshotToDb(snap: CatalogSnapshot): DbFile {
  return {
    updatedAt: snap.updatedAt,
    houses: snap.houses,
    pushSubscriptions: [],
    ...(snap.pushSettings?.templates ? { pushSettings: snap.pushSettings } : {}),
  };
}
