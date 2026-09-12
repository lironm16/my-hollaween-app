"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { HouseActionBar } from "@/components/house-action-bar";
import { HouseDetails } from "@/components/house-details";
import { CodesCopy } from "@/components/codes-copy";
import { formatDisplayAddress } from "@/lib/config";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { visualViewportHeight } from "@/lib/viewport";

const MAP_SHEET_PEEK_VH = 0.7;

function isSheetInteractive(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest("button, a, input, textarea, select, label, [role='button']"))
  );
}

export function MapHouseSheet({
  house,
  clusterHouses,
  clusterOverview = false,
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
  onShowInList,
  onSkip,
  onRestoreRoute,
  skipped,
  index,
  filterMismatchReasons,
}: {
  house: PublicHouse;
  clusterHouses: PublicHouse[];
  clusterOverview?: boolean;
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
  onShowInList?: () => void;
  onSkip?: () => void;
  onRestoreRoute?: () => void;
  skipped?: boolean;
  index?: number;
  filterMismatchReasons?: string[];
}) {
  const labelId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const naturalH = useRef(0);
  const drag = useRef<{ y: number; h: number; moved: boolean } | null>(null);
  const liveH = useRef(0);
  const skipClick = useRef(false);
  const draggingRef = useRef(false);
  const [dragH, setDragH] = useState<number | null>(null);
  const [sheetH, setSheetH] = useState<number | null>(null);
  const multi = clusterHouses.length > 1;
  const overview = multi && clusterOverview;
  const address = formatDisplayAddress(house);
  const clusterKey = clusterHouses.map((item) => item.id).join(",");
  const canEditSelected = Boolean(canEditHouse?.(house.id) && onToggleEdit);
  const height = dragH ?? sheetH;
  const actionMenu = (
    <HouseActionBar
      house={house}
      navOnly={overview}
      liked={liked?.(house.id)}
      visited={visited?.(house.id)}
      onToggleLike={onToggleLike ? () => onToggleLike(house.id) : undefined}
      onToggleVisited={onToggleVisited ? () => onToggleVisited(house.id) : undefined}
      onToggleEdit={canEditSelected ? () => onToggleEdit?.() : undefined}
      onShowOnMap={onShowOnMap}
      onShowInList={onShowInList}
      onSkip={onSkip}
      onRestoreRoute={onRestoreRoute}
      skipped={skipped}
      editing={editing}
      menuPlacement="top"
    />
  );

  useEffect(() => {
    setSheetH(null);
    bodyRef.current?.scrollTo(0, 0);
  }, [clusterKey, house.id, overview]);

  useEffect(() => {
    sheetRef.current?.focus({ preventScroll: true });
  }, [house.id]);

  useEffect(() => {
    if (!editing) return;
    const max = maxPx();
    setSheetH(max);
    liveH.current = max;
  }, [editing, clusterKey, house.id]);

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
  }, [clusterKey, house.id, editing, sheetH, overview]);

  function parentH() {
    const el = sheetRef.current;
    const parent =
      el?.offsetParent instanceof HTMLElement ? el.offsetParent : el?.parentElement;
    return parent?.clientHeight || visualViewportHeight();
  }

  function peekPx() {
    return Math.round(parentH() * MAP_SHEET_PEEK_VH);
  }

  function maxPx() {
    return Math.max(72, parentH() - 8);
  }

  function onSheetPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (isSheetInteractive(event.target)) return;
    if (event.target instanceof Element && event.target.closest(".map-house-sheet-body")) return;
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
        overview && "is-cluster-overview",
        dragH !== null && "is-dragging",
        sheetH !== null && "is-raised",
      )}
      role="dialog"
      aria-labelledby={labelId}
      tabIndex={-1}
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
      <div className="map-house-sheet-chrome map-house-sheet-chrome--compact">
        <div className="map-house-sheet-handle-hit">
          <div className="map-house-sheet-handle" />
        </div>
      </div>
      <div ref={bodyRef} className="map-house-sheet-body">
        {overview ? (
          <div id={labelId} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="map-house-sheet-kicker">{address}</p>
              <p className="map-house-sheet-sub">{clusterHouses.length} בתים</p>
            </div>
            {actionMenu}
          </div>
        ) : (
          <>
            <span id={labelId} className="sr-only">
              {houseHeadline(house)}
            </span>
            <div className="map-house-sheet-cards">
              <section className="map-house-sheet-card is-on">
                {filterMismatchReasons && filterMismatchReasons.length > 0 ? (
                  <p className="filter-mismatch-banner" role="status">
                    מסונן: {filterMismatchReasons.join(" · ")}
                  </p>
                ) : null}
                {pendingNote}
                {editing ? (
                  <>
                    <p className="map-house-sheet-kicker">{houseHeadline(house)}</p>
                    <CodesCopy
                      editCode={editCodeFor?.(house.id) ?? managerEditCode}
                    />
                    {extra}
                  </>
                ) : (
                  <HouseDetails
                    house={house}
                    catalogSource={catalogSource}
                    liked={liked?.(house.id)}
                    onToggleLike={onToggleLike ? () => onToggleLike(house.id) : undefined}
                    visited={visited?.(house.id)}
                    onToggleVisited={
                      onToggleVisited ? () => onToggleVisited(house.id) : undefined
                    }
                    extra={extra}
                    chrome="sheet"
                    index={index}
                    headerMenu={actionMenu}
                  />
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
