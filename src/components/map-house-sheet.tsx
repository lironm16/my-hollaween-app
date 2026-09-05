"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { HouseActionBar } from "@/components/house-action-bar";
import { HouseDetails } from "@/components/house-details";
import { CodesCopy } from "@/components/codes-copy";
import { formatDisplayAddress } from "@/lib/config";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAP_SHEET_PEEK_VH = 0.33;

function isSheetInteractive(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest("button, a, input, textarea, select, label, [role='button']"))
  );
}

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
  editCodeFor,
  canEditHouse,
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
  onToggleVisited?: (id: string) => void;
  extra?: ReactNode;
  catalogSource?: string | null;
  managerEditCode?: string;
  editCodeFor?: (id: string) => string | undefined;
  canEditHouse?: (id: string) => boolean;
  editing?: boolean;
  onToggleEdit?: () => void;
  pendingNote?: ReactNode;
  frozenNote?: ReactNode;
}) {
  const labelId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const naturalH = useRef(0);
  const drag = useRef<{ y: number; h: number; moved: boolean } | null>(null);
  const liveH = useRef(0);
  const skipClick = useRef(false);
  const draggingRef = useRef(false);
  const [dragH, setDragH] = useState<number | null>(null);
  const [sheetH, setSheetH] = useState<number | null>(null);
  const multi = clusterHouses.length > 1;
  const address = formatDisplayAddress(house);
  const clusterKey = clusterHouses.map((item) => item.id).join(",");
  const canEditSelected = Boolean(canEditHouse?.(house.id) && onToggleEdit);
  const height = dragH ?? sheetH;

  useEffect(() => {
    setSheetH(null);
  }, [clusterKey, house.id]);

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
  }, [clusterKey, house.id, editing, sheetH]);

  function peekPx() {
    return Math.round(window.innerHeight * MAP_SHEET_PEEK_VH);
  }

  function maxPx() {
    return Math.max(peekPx(), window.innerHeight - 8);
  }

  function onSheetPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (isSheetInteractive(event.target)) return;
    const h = sheetRef.current?.getBoundingClientRect().height ?? peekPx();
    naturalH.current = h;
    liveH.current = h;
    drag.current = { y: event.clientY, h, moved: false };
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onSheetPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    if (Math.abs(event.clientY - drag.current.y) > 6) drag.current.moved = true;
    const next = Math.min(maxPx(), Math.max(72, drag.current.h + (drag.current.y - event.clientY)));
    liveH.current = next;
    setDragH(next);
  }

  function onSheetPointerUp() {
    if (!drag.current) return;
    const moved = drag.current.moved;
    const h = liveH.current;
    drag.current = null;
    draggingRef.current = false;
    setDragH(null);
    if (!moved) return;
    skipClick.current = true;
    if (h < peekPx() * 0.5) {
      setSheetH(null);
      onClose();
      return;
    }
    setSheetH(h);
  }

  return (
    <div
      ref={sheetRef}
      className={cn(
        "map-house-sheet",
        dragH !== null && "is-dragging",
        sheetH !== null && "is-raised",
      )}
      role="dialog"
      aria-labelledby={labelId}
      style={height != null ? { height } : undefined}
      dir="rtl"
      onPointerDown={onSheetPointerDown}
      onPointerMove={onSheetPointerMove}
      onPointerUp={onSheetPointerUp}
      onPointerCancel={onSheetPointerUp}
      onClickCapture={(event) => {
        if (!skipClick.current) return;
        skipClick.current = false;
        event.stopPropagation();
      }}
    >
      <div className="map-house-sheet-chrome">
        <div className="map-house-sheet-handle-hit">
          <div className="map-house-sheet-handle" />
        </div>
        <HouseActionBar
          house={house}
          liked={liked?.(house.id)}
          visited={visited?.(house.id)}
          onToggleLike={onToggleLike ? () => onToggleLike(house.id) : undefined}
          onToggleVisited={onToggleVisited ? () => onToggleVisited(house.id) : undefined}
          onToggleEdit={canEditSelected ? () => onToggleEdit?.() : undefined}
          editing={editing}
          onClose={onClose}
        />
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
                  if (skipClick.current) return;
                  if (!active) onSelectHouse(item);
                }}
              >
                {active ? pendingNote : null}
                {active ? frozenNote : null}
                {editing && active ? (
                  <>
                    <p className="map-house-sheet-kicker">{houseHeadline(item)}</p>
                    <CodesCopy
                      editCode={editCodeFor?.(item.id) ?? managerEditCode}
                    />
                    {extra}
                  </>
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
                    managerEditCode={editCodeFor?.(item.id) ?? (active ? managerEditCode : undefined)}
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
