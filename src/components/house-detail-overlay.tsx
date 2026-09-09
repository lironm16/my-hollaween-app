"use client";

import { useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { HouseActionBar } from "@/components/house-action-bar";
import { HouseDetails } from "@/components/house-details";
import { CodesCopy } from "@/components/codes-copy";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

export function HouseDetailOverlay({
  house,
  onClose,
  liked,
  onToggleLike,
  visited,
  onToggleVisited,
  extra,
  catalogSource,
  managerEditCode,
  editCodeFor,
  canEditHouse,
  editing,
  onToggleEdit,
  pendingNote,
  onShowOnMap,
  index,
}: {
  house: PublicHouse;
  onClose: () => void;
  liked?: (id: string) => boolean;
  onToggleLike?: (id: string) => void;
  visited?: (id: string) => boolean;
  onToggleVisited?: (id: string) => void;
  extra?: ReactNode;
  catalogSource?: string | null;
  managerEditCode?: string;
  editCodeFor?: (id: string) => string | undefined;
  canEditHouse?: (id: string) => boolean;
  editing?: boolean;
  onToggleEdit?: () => void;
  pendingNote?: ReactNode;
  onShowOnMap?: () => void;
  index?: number;
}) {
  const labelId = useId();
  const canEditSelected = Boolean(canEditHouse?.(house.id) && onToggleEdit);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [house.id]);

  return (
    <div
      className="house-detail-overlay fixed inset-0 z-50 flex flex-col bg-[#160b20]"
      role="dialog"
      aria-labelledby={labelId}
      tabIndex={-1}
      dir="rtl"
    >
      <div className="house-detail-overlay-top shrink-0 pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center justify-end px-2 py-1">
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="inline-flex size-10 items-center justify-center rounded-lg text-orange-100 hover:bg-orange-500/15"
          >
            <X className="size-6" strokeWidth={2.2} />
          </button>
        </div>
        <div className="px-2 pb-1">
          <HouseActionBar
            house={house}
            liked={liked?.(house.id)}
            visited={visited?.(house.id)}
            onToggleLike={onToggleLike ? () => onToggleLike(house.id) : undefined}
            onToggleVisited={onToggleVisited ? () => onToggleVisited(house.id) : undefined}
            onToggleEdit={canEditSelected ? () => onToggleEdit?.() : undefined}
            onShowOnMap={onShowOnMap}
            editing={editing}
          />
        </div>
      </div>
      <div className="house-detail-overlay-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
        <span id={labelId} className="sr-only">
          {houseHeadline(house)}
        </span>
        {pendingNote}
        {editing ? (
          <>
            <p className="map-house-sheet-kicker">{houseHeadline(house)}</p>
            <CodesCopy editCode={editCodeFor?.(house.id) ?? managerEditCode} />
            {extra}
          </>
        ) : (
          <HouseDetails
            house={house}
            catalogSource={catalogSource}
            liked={liked?.(house.id)}
            onToggleLike={onToggleLike ? () => onToggleLike(house.id) : undefined}
            visited={visited?.(house.id)}
            onToggleVisited={onToggleVisited ? () => onToggleVisited(house.id) : undefined}
            extra={extra}
            chrome="sheet"
            index={index}
          />
        )}
      </div>
    </div>
  );
}
