"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { useHouseSet } from "@/hooks/use-house-set";
import {
  buildGemMapHouseRows,
  countGemsOnMapByMonster,
  type GemMapHouseRow,
} from "@/lib/gem-admin-ops";
import { formatDisplayAddress } from "@/lib/config";
import { gemAlbumStickerPool, gemMonsterMeta, type GemMonsterId } from "@/lib/gem-monsters";
import { houseHeadline } from "@/lib/labels";
import { houseSharePath } from "@/lib/nav-links";
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
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <Image
        src={meta.posterPath}
        alt=""
        width={48}
        height={48}
        className="size-12 shrink-0 rounded-xl bg-white object-cover ring-1 ring-violet-500/25"
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
  const { houseSet } = useHouseSet();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [listOnly, setListOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    if (!selectedId) return;
    if (!mapHouses.some((house) => house.id === selectedId)) setSelectedId(null);
  }, [mapHouses, selectedId]);

  function onPickRow(row: GemMapHouseRow) {
    setSelectedId(row.house.id);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative shrink-0">
        <button
          type="button"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((open) => !open)}
          className="flex w-full items-center gap-2 rounded-xl bg-[#12081a] px-3 py-3 text-start ring-1 ring-orange-500/30 hover:ring-orange-400/45"
        >
          <GemPickerRow monsterId={monsterId} count={selectedMonsterCount} selected />
          <ChevronDown
            className={cn("size-5 shrink-0 text-violet-400 transition-transform", pickerOpen && "rotate-180")}
            aria-hidden
          />
        </button>
        {pickerOpen ? (
          <ul
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-[min(24rem,55vh)] overflow-y-auto overscroll-contain rounded-xl bg-[#160b1f] py-1 shadow-xl ring-1 ring-orange-500/35"
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
                      setSelectedId(null);
                    }}
                    className={cn(
                      "flex w-full px-3 py-2.5 text-start transition-colors hover:bg-orange-500/10",
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

      <div className="relative z-0 min-h-[14rem] shrink-0 overflow-hidden rounded-xl ring-1 ring-violet-500/25 sm:min-h-[16rem]">
        <HouseMapDynamic
          houses={mapHouses}
          selectedId={selectedId}
          onSelect={(house) => setSelectedId(house.id)}
          embed
          showGemAnchors
          gemAnchorHouses={mapHouses}
          gemAnchorVisual="characters"
        />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl bg-[#12081a] px-3 py-2.5 ring-1 ring-orange-500/20">
        <div className="min-w-0">
          <p className="text-base font-medium text-orange-100">רשימת בתים לחבר הזה</p>
          <p className="text-sm text-violet-400">{gemRows.length} בתים במפה</p>
        </div>
        <button
          type="button"
          dir="ltr"
          role="switch"
          aria-checked={listOnly}
          aria-label="הצג רק ברשימה"
          onClick={() => setListOnly((on) => !on)}
          className={cn(
            "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition",
            listOnly ? "justify-end bg-orange-500" : "justify-start bg-violet-900 ring-1 ring-orange-500/20",
          )}
        >
          <span className="size-5 rounded-full bg-white shadow" />
        </button>
      </div>

      {listOnly ? (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pb-2">
          {gemRows.map((row) => {
            const meta = gemMonsterMeta(row.monsterId);
            const active = selectedId === row.house.id;
            return (
              <li key={row.house.id}>
                <button
                  type="button"
                  onClick={() => onPickRow(row)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start ring-1 transition-colors",
                    active
                      ? "bg-orange-500/10 ring-orange-400/45"
                      : "bg-black/20 ring-violet-500/15 hover:ring-orange-500/25",
                  )}
                >
                  <Image
                    src={meta.posterPath}
                    alt=""
                    width={36}
                    height={36}
                    className="size-9 shrink-0 rounded-full bg-white object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-orange-50">
                      {houseHeadline(row.house)}
                    </span>
                    <span className="block truncate text-sm text-violet-300">
                      {formatDisplayAddress(row.house)}
                    </span>
                  </span>
                  <Link
                    href={houseSharePath(row.house)}
                    onClick={(event) => event.stopPropagation()}
                    className="shrink-0 text-sm text-orange-200 underline"
                  >
                    פרטים
                  </Link>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-violet-400">
          הפעילו את המתג כדי לראות רשימה; לחצו על סיכה במפה או בחרו בית מהרשימה.
        </p>
      )}

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
