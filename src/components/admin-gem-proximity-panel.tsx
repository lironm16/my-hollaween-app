"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronDown, Navigation, Search } from "lucide-react";
import { AdminGemHousePeek } from "@/components/admin-gem-house-peek";
import { Button } from "@/components/ui/button";
import { useHouseSet } from "@/hooks/use-house-set";
import {
  buildGemMapHouseRows,
  closestGemMapRow,
  filterGemMapRows,
  type GemMapHouseRow,
} from "@/lib/gem-admin-ops";
import { formatDistance } from "@/lib/geo";
import { gemMonsterMeta, type GemMonsterId } from "@/lib/gem-monsters";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Admin בדיקות — חיפוש בית / יהלום קרוב (GPS). */
export function AdminGemProximityPanel({ houses }: { houses: PublicHouse[] }) {
  const { houseSet } = useHouseSet();
  const [query, setQuery] = useState("");
  const [monsterFilter, setMonsterFilter] = useState<GemMonsterId | "all">("all");
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GemMapHouseRow | null>(null);
  const [selectedDistanceM, setSelectedDistanceM] = useState<number | undefined>();
  const [gpsOpen, setGpsOpen] = useState(false);

  const rows = useMemo(() => buildGemMapHouseRows(houses, houseSet), [houses, houseSet]);
  const filtered = useMemo(
    () => filterGemMapRows(rows, { query, monsterId: monsterFilter }),
    [rows, query, monsterFilter],
  );
  const closest = useMemo(
    () => (origin ? closestGemMapRow(origin, rows, monsterFilter) : null),
    [origin, rows, monsterFilter],
  );

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
    <div className="space-y-3 rounded-xl bg-[#12081a] p-3 ring-1 ring-orange-500/20">
      <div>
        <p className="text-base font-medium text-orange-100">חיפוש יהלום / בית (בדיקות)</p>
        <p className="text-sm text-violet-400">
          חיפוש טקסט, סינון לפי חבר, ו«יהלום קרוב» לפי GPS — לשימוש בזמן חזרות.
        </p>
      </div>

      {selected ? (
        <AdminGemHousePeek
          house={selected.house}
          petNameHe={selected.petNameHe}
          distanceM={selectedDistanceM}
          onClose={clearSelection}
        />
      ) : null}

      <label className="flex items-center gap-2 rounded-lg bg-black/25 px-2 ring-1 ring-violet-500/25">
        <Search className="size-4 shrink-0 text-violet-400" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-10 min-w-0 flex-1 bg-transparent text-base text-orange-50 outline-none"
          placeholder="חיפוש בית, כתובת, חבר…"
        />
      </label>

      <div className="rounded-lg bg-black/25 ring-1 ring-violet-500/15">
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

      <p className="text-sm text-violet-400">
        {filtered.length} תוצאות · {rows.length} בתים עם יהלום ({houseSet})
      </p>

      <ul className="max-h-64 space-y-1 overflow-y-auto overscroll-contain">
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
                  <span className="block truncate text-sm text-violet-300">{row.petNameHe}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
