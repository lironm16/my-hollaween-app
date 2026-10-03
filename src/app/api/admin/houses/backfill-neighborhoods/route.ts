import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { isStubHouse } from "@/lib/house-set";
import {
  planNeighborhoodBackfill,
  type NeighborhoodBackfillMode,
} from "@/lib/neighborhood-backfill";
import { runSyncedWrite } from "@/lib/store/core";
import type { House } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const mode: NeighborhoodBackfillMode =
    url.searchParams.get("mode") === "all" ? "all" : "missing";

  const result = await runSyncedWrite((db) => {
    const real = db.houses.filter((h): h is House => !isStubHouse(h));
    const planned = planNeighborhoodBackfill(real, mode);
    if (!dryRun) {
      const byId = new Map(planned.map((entry) => [entry.id, entry.to]));
      for (const house of db.houses) {
        const to = byId.get(house.id);
        if (to !== undefined) house.neighborhood = to;
      }
      db.updatedAt = new Date().toISOString();
    }
    return {
      dryRun,
      mode,
      changed: planned.length,
      changes: planned.slice(0, 200),
      truncated: planned.length > 200,
    };
  });

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
