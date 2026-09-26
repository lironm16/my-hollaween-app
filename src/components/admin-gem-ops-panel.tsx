"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPinned, Navigation, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/hooks/use-catalog";
import { useHouseSet } from "@/hooks/use-house-set";
import {
  buildGemMapHouseRows,
  closestGemMapRow,
  countGemsOnMapByMonster,
  filterGemMapRows,
} from "@/lib/gem-admin-ops";
import { formatDistance } from "@/lib/geo";
import { gemAlbumStickerPool, gemMonsterMeta, type GemMonsterId } from "@/lib/gem-monsters";
import { HOUSE_SET_LABELS, type HouseSet } from "@/lib/house-set";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AdminGemOpsPanel({ houses }: { houses: PublicHouse[] }) {
  const { houseSet, setHouseSet } = useHouseSet();
  const [query, setQuery] = useState("");
  const [monsterFilter, setMonsterFilter] = useState<GemMonsterId | "all">("all");
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const rows = useMemo(
    () => buildGemMapHouseRows(houses, houseSet),
    [houses, houseSet],
  );
  const counts = useMemo(() => countGemsOnMapByMonster(rows), [rows]);
  const pool = useMemo(() => gemAlbumStickerPool(), []);
  const filtered = useMemo(
    () => filterGemMapRows(rows, { query, monsterId: monsterFilter }),
    [rows, query, monsterFilter],
  );
  const closest = useMemo(
    () => (origin ? closestGemMapRow(origin, rows, monsterFilter) : null),
    [origin, rows, monsterFilter],
  );

  function useMyLocation() {
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError("אין GPS במכשיר");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocError("לא הצלחנו לקרוא מיקום — אפשרו GPS");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-base text-violet-300">
        סיכום יהלומים על המפה ({rows.length} בתים), חיפוש בית/חבר, ומציאת היהלום הקרוב למיקום שלכם.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(HOUSE_SET_LABELS) as HouseSet[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setHouseSet(id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-base",
              houseSet === id
                ? "bg-orange-500 text-black"
                : "bg-[#12081a] text-orange-100 ring-1 ring-orange-500/20",
            )}
          >
            {HOUSE_SET_LABELS[id]}
          </button>
        ))}
      </div>

      <section className="space-y-2 rounded-xl bg-[#12081a] p-3 ring-1 ring-orange-500/20">
        <h2 className="text-base font-medium text-orange-100">חברים על המפה</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {pool.map((monster) => {
            const n = counts.get(monster.id as GemMonsterId) ?? 0;
            const active = monsterFilter === monster.id;
            return (
              <button
                key={monster.id}
                type="button"
                onClick={() =>
                  setMonsterFilter((current) =>
                    current === monster.id ? "all" : (monster.id as GemMonsterId),
                  )
                }
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-start ring-1 transition-colors",
                  active
                    ? "bg-orange-500/15 ring-orange-400/50"
                    : "bg-black/20 ring-violet-500/20 hover:ring-orange-500/30",
                )}
              >
                <Image
                  src={monster.posterPath}
                  alt=""
                  width={36}
                  height={36}
                  className="size-9 shrink-0 rounded-full bg-white object-cover ring-1 ring-orange-500/30"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-orange-50">
                    {monster.petNameHe}
                  </span>
                  <span className="block text-sm tabular-nums text-violet-300">{n} על המפה</span>
                </span>
              </button>
            );
          })}
        </div>
        {monsterFilter !== "all" ? (
          <button
            type="button"
            className="text-sm text-orange-200 underline"
            onClick={() => setMonsterFilter("all")}
          >
            הצג את כל החברים
          </button>
        ) : null}
      </section>

      <section className="space-y-2 rounded-xl bg-[#12081a] p-3 ring-1 ring-orange-500/20">
        <h2 className="text-base font-medium text-orange-100">מיקום ויהלום קרוב</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={locating} onClick={useMyLocation}>
            <Navigation className="size-4" aria-hidden />
            {locating ? "מחפש GPS…" : "המיקום שלי"}
          </Button>
          {origin ? (
            <p className="self-center text-sm text-violet-300" dir="ltr">
              {origin.lat.toFixed(5)}, {origin.lng.toFixed(5)}
            </p>
          ) : null}
        </div>
        {locError ? <p className="text-sm text-amber-200">{locError}</p> : null}
        {closest ? (
          <div className="rounded-lg bg-black/25 p-3 ring-1 ring-emerald-500/30">
            <p className="text-sm text-violet-300">הכי קרוב ({formatDistance(closest.distanceM)}):</p>
            <p className="font-medium text-orange-50">{houseHeadline(closest.house)}</p>
            <p className="text-sm text-violet-200">{closest.petNameHe}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={`/?focus=${encodeURIComponent(closest.house.id)}`}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-orange-500 px-3 text-sm font-medium text-black"
              >
                <MapPinned className="size-4" />
                במפה
              </Link>
              <Link
                href={`/?focus=${encodeURIComponent(closest.house.id)}&gemHunt=1`}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-violet-800 px-3 text-sm text-orange-50 ring-1 ring-violet-400/40"
              >
                ציד יהלום
              </Link>
            </div>
          </div>
        ) : origin ? (
          <p className="text-sm text-violet-400">אין בתים במסנן הנוכחי.</p>
        ) : null}
      </section>

      <section className="space-y-2 rounded-xl bg-[#12081a] p-3 ring-1 ring-orange-500/20">
        <label className="block space-y-1.5">
          <span className="text-base font-medium text-orange-100">חיפוש בית / כתובת / חבר</span>
          <span className="flex items-center gap-2 rounded-lg bg-black/30 px-2 ring-1 ring-violet-500/25">
            <Search className="size-4 shrink-0 text-violet-400" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 min-w-0 flex-1 bg-transparent text-base text-orange-50 outline-none"
              placeholder="שם, רחוב, מזהה…"
            />
          </span>
        </label>
        <p className="text-sm text-violet-400">
          {filtered.length} מתוך {rows.length} בתים
          {monsterFilter !== "all" ? ` · מסונן לחבר` : ""}
        </p>
        <ul className="max-h-[min(50vh,28rem)] space-y-1 overflow-y-auto overscroll-contain">
          {filtered.map((row) => {
            const meta = gemMonsterMeta(row.monsterId);
            return (
              <li
                key={row.house.id}
                className="flex items-center gap-2 rounded-lg bg-black/20 px-2 py-1.5 ring-1 ring-violet-500/15"
              >
                <Image
                  src={meta.posterPath}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded-full bg-white object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-orange-50">{houseHeadline(row.house)}</p>
                  <p className="truncate text-sm text-violet-300">
                    {row.petNameHe} · {row.house.address}
                  </p>
                </div>
                <Link
                  href={`/?focus=${encodeURIComponent(row.house.id)}`}
                  className="shrink-0 rounded-lg px-2 py-1 text-sm text-orange-200 ring-1 ring-orange-500/30"
                >
                  מפה
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-sm text-violet-400">
        קישורים:{" "}
        <Link href="/admin/rehearsal" className="text-orange-200 underline">
          בדיקות
        </Link>
        {" · "}
        <Link href="/gem-bag" className="text-orange-200 underline">
          ספר החברים
        </Link>
      </p>
    </div>
  );
}
