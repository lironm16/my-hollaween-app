"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { MapHouseSheet } from "@/components/map-house-sheet";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import type { HouseCardActionContext } from "@/components/house-card-actions";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useGemProgress } from "@/hooks/use-gem-progress";
import { useHouseSet } from "@/hooks/use-house-set";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useSkippedHouses } from "@/hooks/use-skipped-houses";
import { useUserLocation } from "@/hooks/use-user-location";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { useAppNow } from "@/hooks/use-app-clock";
import {
  buildGemMapHouseRows,
  countGemsOnMapByMonster,
} from "@/lib/gem-admin-ops";
import { gemHuntVisible } from "@/lib/gem-hunt-enabled";
import { clusterHousesByAddress } from "@/lib/house-clusters";
import { gemAlbumStickerPool, gemMonsterMeta, type GemMonsterId } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

function GemPickerRow({
  monsterId,
  count,
  selected,
}: {
  monsterId: GemMonsterId;
  count: number;
  selected?: boolean;
}) {
  const meta = gemMonsterMeta(monsterId);
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <Image
        src={meta.posterPath}
        alt=""
        width={44}
        height={44}
        className="size-11 shrink-0 rounded-lg bg-white object-cover ring-1 ring-violet-500/25"
      />
      <span className="min-w-0 flex-1 text-start">
        <span className="block truncate text-base font-semibold text-orange-50">{meta.petNameHe}</span>
        <span className="block text-sm text-violet-400">{count} בתים</span>
      </span>
      {selected ? (
        <span className="shrink-0 text-sm tabular-nums text-orange-300">{count}</span>
      ) : null}
    </span>
  );
}

export function AdminGemOpsPanel({ houses }: { houses: PublicHouse[] }) {
  const { admin } = useAdminSession();
  const { source } = useCatalog();
  const now = useAppNow();
  const gemUi = gemHuntVisible(admin);
  const { houseSet } = useHouseSet();
  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const skips = useSkippedHouses();
  const gems = useGemProgress();
  const geo = useUserLocation({ watch: false });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sheetHouse, setSheetHouse] = useState<PublicHouse | null>(null);

  const rows = useMemo(() => buildGemMapHouseRows(houses, houseSet), [houses, houseSet]);
  const counts = useMemo(() => countGemsOnMapByMonster(rows), [rows]);
  const pool = useMemo(() => gemAlbumStickerPool(), []);

  const [monsterId, setMonsterId] = useState<GemMonsterId>(() => pool[0]?.id as GemMonsterId);

  useEffect(() => {
    if (pool.some((m) => m.id === monsterId)) return;
    const first = pool[0]?.id as GemMonsterId | undefined;
    if (first) setMonsterId(first);
  }, [pool, monsterId]);

  const gemRows = useMemo(
    () => rows.filter((row) => row.monsterId === monsterId),
    [rows, monsterId],
  );
  const mapHouses = useMemo(() => gemRows.map((row) => row.house), [gemRows]);
  const selectedMonsterCount = counts.get(monsterId) ?? 0;

  useEffect(() => {
    if (!sheetHouse) return;
    if (!mapHouses.some((house) => house.id === sheetHouse.id)) setSheetHouse(null);
  }, [mapHouses, sheetHouse]);

  const clusterHouses = useMemo(() => {
    if (!sheetHouse) return [];
    for (const cluster of clusterHousesByAddress(mapHouses)) {
      if (cluster.houses.some((house) => house.id === sheetHouse.id)) return cluster.houses;
    }
    return [sheetHouse];
  }, [sheetHouse, mapHouses]);

  const onLocate = useCallback(() => {
    void geo.refresh();
  }, [geo]);

  const openSheet = useCallback((house: PublicHouse) => {
    setSheetHouse(house);
  }, []);

  const actionContext = useMemo((): HouseCardActionContext => {
    return {
      admin: true,
      catalogSource: source,
      liked: likes.liked,
      visited: visits.visited,
      skipped: skips.skipped,
      gemCollected: gemUi ? gems.collected : undefined,
      onToggleLike: (id) => likes.toggle(id),
      onToggleVisited: (id) => visits.toggle(id),
      onSkip: (id) => skips.toggle(id),
      onRestore: (id) => skips.unskip(id),
      skipMetaFor: (id) => skips.meta(id),
    };
  }, [source, likes, visits, skips, gemUi, gems.collected]);

  return (
    <div className="flex flex-col gap-1">
      <div className="relative shrink-0">
        <button
          type="button"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((open) => !open)}
          className="flex w-full items-center gap-1.5 rounded-lg bg-[#12081a] px-2 py-2 text-start ring-1 ring-orange-500/30 hover:ring-orange-400/45"
        >
          <GemPickerRow monsterId={monsterId} count={selectedMonsterCount} selected />
          <ChevronDown
            className={cn("size-5 shrink-0 text-violet-400 transition-transform", pickerOpen && "rotate-180")}
            aria-hidden
          />
        </button>
        {pickerOpen ? (
          <ul
            className="absolute inset-x-0 top-full z-20 mt-0.5 max-h-[min(24rem,55vh)] overflow-y-auto overscroll-contain rounded-lg bg-[#160b1f] py-0.5 shadow-xl ring-1 ring-orange-500/35"
            role="listbox"
          >
            {pool.map((monster) => {
              const id = monster.id as GemMonsterId;
              const n = counts.get(id) ?? 0;
              const active = id === monsterId;
              return (
                <li key={monster.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setMonsterId(id);
                      setPickerOpen(false);
                      setSheetHouse(null);
                    }}
                    className={cn(
                      "flex w-full px-2 py-2 text-start transition-colors hover:bg-orange-500/10",
                      active && "bg-orange-500/15",
                    )}
                  >
                    <GemPickerRow monsterId={id} count={n} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="relative z-0 h-[min(52vh,22rem)] w-full shrink-0 overflow-hidden rounded-lg ring-1 ring-violet-500/25">
        <HouseMapDynamic
          houses={mapHouses}
          selectedId={sheetHouse?.id ?? null}
          onSelect={(house) => openSheet(house)}
          onClose={() => setSheetHouse(null)}
          followSelection={false}
          embed
          embedCenterOnSelect={false}
          showLocateButton
          userLocation={geo.location}
          locating={geo.status === "pending"}
          onLocate={onLocate}
          showGemAnchors
          gemAnchorHouses={mapHouses}
          gemAnchorVisual="characters"
          isGemCollected={gems.collected}
          onGemAnchorSelect={openSheet}
          className="absolute inset-0 h-full w-full"
        />
        {sheetHouse ? (
          <div className="map-sheet-host">
            <MapHouseSheet
              house={sheetHouse}
              actionContext={actionContext}
              clusterHouses={clusterHouses}
              onClose={() => setSheetHouse(null)}
              now={now}
              skippedIds={skips.skipped}
              liked={likes.liked}
              visited={visits.visited}
              gemCollected={gemUi ? gems.collected : undefined}
              onSelectClusterHouse={(id) => {
                const next = mapHouses.find((house) => house.id === id);
                if (next) setSheetHouse(next);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
