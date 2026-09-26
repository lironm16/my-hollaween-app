"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Navigation, Search } from "lucide-react";
import { AdminGemHousePeek } from "@/components/admin-gem-house-peek";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHouseSet } from "@/hooks/use-house-set";
import {
  buildGemMapHouseRows,
  closestGemMapRow,
  countGemsOnMapByMonster,
  filterGemMapRows,
  type GemMapHouseRow,
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
  const [selected, setSelected] = useState<GemMapHouseRow | null>(null);
  const [selectedDistanceM, setSelectedDistanceM] = useState<number | undefined>();
  const [gpsOpen, setGpsOpen] = useState(false);

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

  const peekRow = selected ?? (closest && origin ? closest : null);

  function pickRow(row: GemMapHouseRow, distanceM?: number) {
    setSelected(row);
    setSelectedDistanceM(distanceM);
  }

  function clearSelection() {
    setSelected(null);
    setSelectedDistanceM(undefined);
  }

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
        setGpsOpen(true);
      },
      () => {
        setLocating(false);
        setLocError("לא הצלחנו לקרוא מיקום — אפשרו GPS");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {(Object.keys(HOUSE_SET_LABELS) as HouseSet[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setHouseSet(id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-sm",
              houseSet === id
                ? "bg-orange-500 text-black"
                : "bg-[#12081a] text-orange-100 ring-1 ring-orange-500/20",
            )}
          >
            {HOUSE_SET_LABELS[id]}
          </button>
        ))}
        <span className="ms-auto text-sm text-violet-400">{rows.length} בתים</span>
      </div>

      {selected ? (
        <AdminGemHousePeek
          house={selected.house}
          petNameHe={selected.petNameHe}
          distanceM={selectedDistanceM}
          onClose={clearSelection}
        />
      ) : null}

      <Tabs defaultValue="houses" className="flex min-h-0 flex-1 flex-col gap-2">
        <TabsList className="w-full shrink-0 bg-[#12081a] ring-1 ring-orange-500/20">
          <TabsTrigger value="houses" className="flex-1 data-active:bg-orange-500/20">
            בתים
          </TabsTrigger>
          <TabsTrigger value="friends" className="flex-1 data-active:bg-orange-500/20">
            חברים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-wrap gap-2 pb-2">
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
                    "inline-flex items-center gap-1.5 rounded-full py-1 ps-1 pe-2.5 ring-1",
                    active
                      ? "bg-orange-500/15 ring-orange-400/50"
                      : "bg-black/25 ring-violet-500/20",
                  )}
                >
                  <Image
                    src={monster.posterPath}
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 rounded-full bg-white object-cover"
                  />
                  <span className="text-sm text-orange-50">{monster.petNameHe}</span>
                  <span className="text-sm tabular-nums text-violet-300">{n}</span>
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
              ביטול סינון חבר
            </button>
          ) : (
            <p className="text-sm text-violet-400">לחצו על חבר לסינון הרשימה בלשונית «בתים».</p>
          )}
        </TabsContent>

        <TabsContent value="houses" className="flex min-h-0 flex-1 flex-col gap-2">
          <label className="flex shrink-0 items-center gap-2 rounded-lg bg-[#12081a] px-2 ring-1 ring-violet-500/25">
            <Search className="size-4 shrink-0 text-violet-400" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 min-w-0 flex-1 bg-transparent text-base text-orange-50 outline-none"
              placeholder="חיפוש בית, כתובת, חבר…"
            />
          </label>

          <div className="shrink-0 rounded-lg bg-[#12081a] ring-1 ring-violet-500/15">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start"
              onClick={() => setGpsOpen((open) => !open)}
            >
              <span className="text-sm font-medium text-orange-100">יהלום קרוב (GPS)</span>
              <ChevronDown
                className={cn("size-4 text-violet-400 transition-transform", gpsOpen && "rotate-180")}
              />
            </button>
            {gpsOpen ? (
              <div className="space-y-2 border-t border-violet-500/15 px-3 pb-3 pt-2">
                <Button type="button" size="sm" disabled={locating} onClick={useMyLocation}>
                  <Navigation className="size-4" aria-hidden />
                  {locating ? "מחפש…" : "המיקום שלי"}
                </Button>
                {locError ? <p className="text-sm text-amber-200">{locError}</p> : null}
                {closest ? (
                  <button
                    type="button"
                    onClick={() => pickRow(closest, closest.distanceM)}
                    className="w-full rounded-lg bg-emerald-950/40 px-2 py-2 text-start ring-1 ring-emerald-500/30"
                  >
                    <p className="text-sm text-emerald-200/90">
                      הכי קרוב · {formatDistance(closest.distanceM)}
                    </p>
                    <p className="font-medium text-orange-50">{houseHeadline(closest.house)}</p>
                    <p className="text-sm text-violet-300">{closest.petNameHe}</p>
                  </button>
                ) : origin ? (
                  <p className="text-sm text-violet-400">אין בתים במסנן.</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <p className="shrink-0 text-sm text-violet-400">
            {filtered.length} תוצאות
            {monsterFilter !== "all" ? " · מסונן לחבר" : ""}
          </p>

          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pb-2">
            {filtered.map((row) => {
              const meta = gemMonsterMeta(row.monsterId);
              const isSelected = selected?.house.id === row.house.id;
              return (
                <li key={row.house.id}>
                  <button
                    type="button"
                    onClick={() => pickRow(row)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start ring-1 transition-colors",
                      isSelected
                        ? "bg-orange-500/10 ring-orange-400/45"
                        : "bg-black/20 ring-violet-500/15 hover:ring-orange-500/25",
                    )}
                  >
                    <Image
                      src={meta.posterPath}
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 shrink-0 rounded-full bg-white object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-orange-50">
                        {houseHeadline(row.house)}
                      </span>
                      <span className="block truncate text-sm text-violet-300">
                        {row.petNameHe}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </TabsContent>
      </Tabs>

      <p className="shrink-0 text-center text-xs text-violet-500">
        <Link href="/admin/rehearsal" className="text-orange-200/80 underline">
          בדיקות
        </Link>
        {" · "}
        <Link href="/gem-bag" className="text-orange-200/80 underline">
          ספר החברים
        </Link>
      </p>
    </div>
  );
}
