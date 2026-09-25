"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { HouseCard } from "@/components/house-card";
import { houseCardPropsFor, type HouseCardActionContext } from "@/components/house-card-actions";
import { HouseEditModal } from "@/components/house-edit-modal";
import {
  ClusterHouseNav,
  ClusterHouseSwipeArea,
  adjacentClusterHouseId,
} from "@/components/cluster-house-list";
import { houseHeadline } from "@/lib/labels";
import type { RouteStatusChangeEntry } from "@/lib/route-changes";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RouteChangesSheet({
  open,
  changes,
  onClose,
  onFocusHouse,
  actionContext,
}: {
  open: boolean;
  changes: RouteStatusChangeEntry[];
  onClose: () => void;
  onFocusHouse?: (house: PublicHouse) => void;
  actionContext: HouseCardActionContext;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  const houses = useMemo(() => changes.map((change) => change.house), [changes]);
  const reasonById = useMemo(
    () => new Map(changes.map((change) => [change.houseId, change.reason])),
    [changes],
  );
  const selected = detailId ? houses.find((house) => house.id === detailId) ?? null : null;
  const listMode = !selected;

  useEffect(() => {
    if (!open) {
      setDetailId(null);
      setViewedIds([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDetailId(null);
    setViewedIds([]);
  }, [open, changes.map((change) => change.houseId).join("\0")]);

  function openDetail(id: string) {
    setDetailId(id);
    setViewedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    const house = houses.find((item) => item.id === id);
    if (house) onFocusHouse?.(house);
  }

  function closeSheet() {
    setDetailId(null);
    onClose();
  }

  return (
    <HouseEditModal
      open={open}
      onClose={closeSheet}
      title={listMode ? "עדכונים במסלול" : houseHeadline(selected!)}
      subtitle={
        listMode
          ? changes.length === 1
            ? "שינוי אחד במסלול הפעיל"
            : `${changes.length} שינויים במסלול הפעיל`
          : reasonById.get(selected!.id)
      }
      className="route-changes-sheet"
    >
      {listMode ? (
        <ul className="space-y-2">
          {changes.map((change) => {
            const viewed = viewedIds.includes(change.houseId);
            return (
              <li key={change.houseId}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border border-orange-500/20 bg-[#24132f] px-3 py-3 text-start transition-colors hover:bg-orange-500/10",
                    viewed && "border-emerald-500/25",
                  )}
                  onClick={() => openDetail(change.houseId)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-orange-100">{change.name}</span>
                    <span className="mt-0.5 block text-base text-violet-300">{change.reason}</span>
                  </span>
                  {viewed ? (
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check className="size-4" strokeWidth={3} aria-hidden />
                    </span>
                  ) : (
                    <ChevronLeft className="size-4 shrink-0 text-violet-400" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex min-h-0 flex-col gap-3">
          <ClusterHouseNav
            houses={houses}
            selectedId={selected!.id}
            backLabel="חזרה לעדכונים"
            onBack={() => setDetailId(null)}
            onPrev={() => {
              const id = adjacentClusterHouseId(houses, selected!.id, -1);
              if (id) openDetail(id);
            }}
            onNext={() => {
              const id = adjacentClusterHouseId(houses, selected!.id, 1);
              if (id) openDetail(id);
            }}
          />
          <ClusterHouseSwipeArea
            canPrev={Boolean(adjacentClusterHouseId(houses, selected!.id, -1))}
            canNext={Boolean(adjacentClusterHouseId(houses, selected!.id, 1))}
            onPrev={() => {
              const id = adjacentClusterHouseId(houses, selected!.id, -1);
              if (id) openDetail(id);
            }}
            onNext={() => {
              const id = adjacentClusterHouseId(houses, selected!.id, 1);
              if (id) openDetail(id);
            }}
          >
            <HouseCard
              {...houseCardPropsFor(selected!, actionContext, {
                expanded: true,
                hideHoursBanner: Boolean(
                  actionContext.visited(selected!.id) || actionContext.skipped(selected!.id),
                ),
              })}
            />
          </ClusterHouseSwipeArea>
        </div>
      )}
    </HouseEditModal>
  );
}
