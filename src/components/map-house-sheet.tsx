"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { HouseActionBar } from "@/components/house-action-bar";
import { HouseDetails } from "@/components/house-details";
import { formatDisplayAddress } from "@/lib/config";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAP_SHEET_MAX_VH = 0.33;

export function MapHouseSheet({
  house,
  clusterHouses,
  onSelectHouse,
  onClose,
  liked,
  onToggleLike,
  visited,
  onToggleVisited,
  extra,
  catalogSource,
  managerEditCode,
  canEdit,
  editing,
  onToggleEdit,
  pendingNote,
  frozenNote,
}: {
  house: PublicHouse;
  clusterHouses: PublicHouse[];
  onSelectHouse: (house: PublicHouse) => void;
  onClose: () => void;
  liked?: (id: string) => boolean;
  onToggleLike?: (id: string) => void;
  visited?: (id: string) => boolean;
  onToggleVisited?: (id: string) => void;
  extra?: ReactNode;
  catalogSource?: string | null;
  managerEditCode?: string;
  canEdit?: boolean;
  editing?: boolean;
  onToggleEdit?: () => void;
  pendingNote?: ReactNode;
  frozenNote?: ReactNode;
}) {
  const labelId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const naturalH = useRef(0);
  const drag = useRef<{ y: number; h: number; moved: boolean } | null>(null);
  const skipClick = useRef(false);
  const draggingRef = useRef(false);
  const [dragH, setDragH] = useState<number | null>(null);
  const multi = clusterHouses.length > 1;
  const address = formatDisplayAddress(house);
  const clusterKey = clusterHouses.map((item) => item.id).join(",");

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;

    const publish = (h: number) => {
      document.documentElement.style.setProperty("--map-sheet-h", `${h}px`);
      window.dispatchEvent(new CustomEvent("hw-map-sheet", { detail: { height: h } }));
    };

    const measure = () => {
      if (draggingRef.current) return;
      const h = el.getBoundingClientRect().height;
      naturalH.current = h;
      publish(h);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--map-sheet-h");
    };
  }, [clusterKey, house.id, editing]);

  function maxSheetPx() {
    return Math.round(window.innerHeight * MAP_SHEET_MAX_VH);
  }

  function onHandlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const h = sheetRef.current?.getBoundingClientRect().height ?? maxSheetPx();
    naturalH.current = h;
    drag.current = { y: event.clientY, h, moved: false };
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onHandlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    if (Math.abs(event.clientY - drag.current.y) > 6) drag.current.moved = true;
    const next = drag.current.h + (drag.current.y - event.clientY);
    setDragH(Math.min(drag.current.h, Math.max(72, next)));
  }

  function onHandlePointerUp() {
    if (!drag.current) return;
    const start = drag.current.h;
    const h = dragH ?? start;
    if (drag.current.moved) skipClick.current = true;
    drag.current = null;
    draggingRef.current = false;
    setDragH(null);
    if (h < start * 0.55) onClose();
  }

  function handleEdit(item: PublicHouse) {
    if (item.id !== house.id) {
      onSelectHouse(item);
      if (!editing) onToggleEdit?.();
      return;
    }
    onToggleEdit?.();
  }

  return (
    <div
      ref={sheetRef}
      className={cn("map-house-sheet", dragH !== null && "is-dragging")}
      role="dialog"
      aria-labelledby={labelId}
      style={dragH !== null ? { height: dragH } : undefined}
      dir="rtl"
    >
      <div className="map-house-sheet-chrome">
        <div
          className="map-house-sheet-handle-hit"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          onClick={() => {
            if (skipClick.current) skipClick.current = false;
          }}
        >
          <div className="map-house-sheet-handle" />
        </div>
        <button
          type="button"
          className="house-action-btn is-close"
          aria-label="סגירה"
          onClick={onClose}
        >
          <X className="size-5" strokeWidth={2.5} />
        </button>
      </div>
      <div className="map-house-sheet-body">
        {multi ? (
          <p id={labelId} className="map-house-sheet-kicker">
            {address}
            <span className="map-house-sheet-sub"> · {clusterHouses.length} דירות</span>
          </p>
        ) : (
          <span id={labelId} className="sr-only">
            {houseHeadline(house)}
          </span>
        )}
        <div className="map-house-sheet-cards">
          {clusterHouses.map((item) => {
            const active = item.id === house.id;
            return (
              <section
                key={item.id}
                className={cn("map-house-sheet-card", active && "is-on")}
                onClick={() => {
                  if (!active) onSelectHouse(item);
                }}
              >
                <HouseActionBar
                  house={item}
                  liked={liked?.(item.id)}
                  visited={visited?.(item.id)}
                  onToggleLike={onToggleLike ? () => onToggleLike(item.id) : undefined}
                  onToggleVisited={
                    onToggleVisited ? () => onToggleVisited(item.id) : undefined
                  }
                />
                {active ? pendingNote : null}
                {active ? frozenNote : null}
                {editing && active ? (
                  <div className="map-house-sheet-edit-bar">
                    <p className="map-house-sheet-kicker">{houseHeadline(item)}</p>
                    {onToggleEdit ? (
                      <button
                        type="button"
                        className="map-house-sheet-edit is-on"
                        onClick={() => onToggleEdit()}
                      >
                        סגירת עריכה
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {editing && active ? (
                  extra
                ) : (
                  <HouseDetails
                    house={item}
                    catalogSource={catalogSource}
                    liked={liked?.(item.id)}
                    onToggleLike={onToggleLike ? () => onToggleLike(item.id) : undefined}
                    visited={visited?.(item.id)}
                    onToggleVisited={
                      onToggleVisited ? () => onToggleVisited(item.id) : undefined
                    }
                    managerEditCode={active ? managerEditCode : undefined}
                    canEdit={canEdit}
                    editing={editing && active}
                    onToggleEdit={onToggleEdit ? () => handleEdit(item) : undefined}
                    extra={active ? extra : undefined}
                    chrome="sheet"
                  />
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
