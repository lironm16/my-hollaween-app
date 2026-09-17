"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { HouseActionBar } from "@/components/house-action-bar";
import { HouseDetails } from "@/components/house-details";
import { FilterMismatchNotice } from "@/components/house-skipped-banner";
import { CodesCopy } from "@/components/codes-copy";
import {
  ClusterHouseList,
  ClusterHouseNav,
  ClusterHouseSwipeArea,
  clusterHouseIndex,
} from "@/components/cluster-house-list";
import { formatDisplayAddress } from "@/lib/config";
import { houseHeadline } from "@/lib/labels";
import type { SkippedHouseMeta } from "@/lib/offline-db";
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
  onSelectClusterHouse,
  onAdjacentClusterHouse,
  onBackToClusterOverview,
  onClose,
  now,
  skippedIds,
  filteredOutIds,
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
  onShowOnMap,
  onShowInList,
  onSkip,
  onRestoreRoute,
  skipped,
  skipMeta,
  index,
  filterMismatchReasons,
}: {
  house: PublicHouse;
  clusterHouses: PublicHouse[];
  clusterOverview?: boolean;
  onSelectClusterHouse?: (id: string) => void;
  onAdjacentClusterHouse?: (delta: -1 | 1) => void;
  onBackToClusterOverview?: () => void;
  onClose: () => void;
  now?: Date;
  skippedIds?: (id: string) => boolean;
  filteredOutIds?: (id: string) => boolean;
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
  onShowOnMap?: () => void;
  onShowInList?: () => void;
  onSkip?: () => void;
  onRestoreRoute?: () => void;
  skipped?: boolean;
  skipMeta?: SkippedHouseMeta;
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
  const sheetOpenRef = useRef(false);
  const detailHeightLockedRef = useRef(false);
  const [dragH, setDragH] = useState<number | null>(null);
  const [sheetH, setSheetH] = useState<number | null>(null);
  const [fitH, setFitH] = useState<number | null>(null);
  const [openH, setOpenH] = useState(0);
  const multi = clusterHouses.length > 1;
  const overview = multi && clusterOverview;
  const address = formatDisplayAddress(house);
  const clusterKey = clusterHouses.map((item) => item.id).join(",");
  const canEditSelected = Boolean(canEditHouse?.(house.id) && onToggleEdit);
  const clusterIndex = clusterHouseIndex(clusterHouses, house.id);
  const canPrevCluster = clusterIndex != null && clusterIndex > 1;
  const canNextCluster =
    clusterIndex != null && clusterIndex < clusterHouses.length;
  const displayH = overview ? (dragH ?? sheetH) : (dragH ?? sheetH ?? openH);
  const clusterNow = now ?? new Date();
  const isSkipped = skippedIds ?? (() => false);
  const isFilteredOut = filteredOutIds ?? (() => false);
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

  function parentH() {
    const el = sheetRef.current;
    const parent =
      el?.offsetParent instanceof HTMLElement ? el.offsetParent : el?.parentElement;
    return parent?.clientHeight || visualViewportHeight();
  }

  function peekPx(fraction = MAP_SHEET_PEEK_VH) {
    return Math.round(parentH() * fraction);
  }

  /** Cluster overview always opens to the same 70% map cap as other sheets; list scrolls inside. */
  function measureOverviewHeight() {
    return peekPx();
  }

  function maxPx() {
    return Math.max(72, parentH() - 8);
  }

  function measureFitHeight() {
    const el = sheetRef.current;
    const body = bodyRef.current;
    if (!el || !body) return null;
    const chrome = el.querySelector(".map-house-sheet-chrome");
    const chromeH = chrome instanceof HTMLElement ? chrome.offsetHeight : 0;
    const contentH = body.scrollHeight;
    return Math.min(peekPx(), Math.max(72, Math.ceil(chromeH + contentH)));
  }

  function publishSheetHeight(h: number) {
    document.documentElement.style.setProperty("--map-sheet-h", `${h}px`);
    window.dispatchEvent(new CustomEvent("hw-map-sheet", { detail: { height: h } }));
  }

  useLayoutEffect(() => {
    setDragH(null);
    setFitH(null);
    setOpenH(0);
    sheetOpenRef.current = false;
    detailHeightLockedRef.current = false;
    bodyRef.current?.scrollTo(0, 0);
    if (overview) {
      const cap = measureOverviewHeight();
      naturalH.current = cap;
      setSheetH(cap);
      document.documentElement.style.setProperty("--map-cluster-sheet-h", `${cap}px`);
      publishSheetHeight(cap);
      return;
    }
    setSheetH(null);
    document.documentElement.style.removeProperty("--map-cluster-sheet-h");
  }, [clusterKey, overview, clusterHouses.length]);

  useLayoutEffect(() => {
    if (overview) return;
    if (detailHeightLockedRef.current) {
      bodyRef.current?.scrollTo(0, 0);
      return;
    }
    bodyRef.current?.scrollTo(0, 0);
    const next = measureFitHeight();
    if (next == null) return;
    naturalH.current = next;
    setFitH(next);
    if (sheetOpenRef.current) {
      setOpenH(next);
      publishSheetHeight(next);
    }
  }, [
    clusterKey,
    overview,
    editing,
    skipped,
    filterMismatchReasons?.join("\0"),
  ]);

  useLayoutEffect(() => {
    if (overview || !detailHeightLockedRef.current) return;
    bodyRef.current?.scrollTo(0, 0);
  }, [house.id, overview]);

  useEffect(() => {
    sheetOpenRef.current = (dragH ?? sheetH ?? openH) > 0;
    if (multi && !overview && (dragH ?? sheetH ?? openH) > 0) {
      detailHeightLockedRef.current = true;
    }
  }, [dragH, sheetH, openH, multi, overview]);

  useEffect(() => {
    if (overview || editing || sheetH !== null || dragH !== null) return;
    if (fitH == null) return;
    if (detailHeightLockedRef.current && openH > 0) return;
    const id = requestAnimationFrame(() => setOpenH(fitH));
    return () => cancelAnimationFrame(id);
  }, [fitH, overview, editing, sheetH, dragH, openH]);

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
    const body = bodyRef.current;
    if (!el || !body) return;

    const publishCurrent = () => {
      if (draggingRef.current) return;
      const h = el.getBoundingClientRect().height;
      if (h > 0) {
        naturalH.current = h;
        publishSheetHeight(h);
      }
    };

    const remeasure = () => {
      if (draggingRef.current || editing || sheetH !== null || overview) return;
      if (detailHeightLockedRef.current) return;
      const next = measureFitHeight();
      if (next == null) return;
      naturalH.current = next;
      setFitH(next);
    };

    if (overview || editing || sheetH !== null) {
      publishCurrent();
      const ro = new ResizeObserver(publishCurrent);
      ro.observe(el);
      return () => {
        ro.disconnect();
        document.documentElement.style.removeProperty("--map-sheet-h");
        document.documentElement.style.removeProperty("--map-cluster-sheet-h");
      };
    }

    const ro = new ResizeObserver(() => {
      remeasure();
      publishCurrent();
    });
    ro.observe(body);
    ro.observe(el);
    publishCurrent();
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--map-sheet-h");
    };
  }, [clusterKey, editing, sheetH, overview]);

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
    const closeBelow = Math.min(peekPx(), naturalH.current || peekPx()) * 0.5;
    if (h < closeBelow) {
      setSheetH(null);
      setFitH(null);
      setOpenH(0);
      onClose();
      return;
    }
    setSheetH(h);
  }

  function onHeightTransitionEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (event.propertyName !== "height") return;
    const h = sheetRef.current?.getBoundingClientRect().height ?? 0;
    if (h > 0) publishSheetHeight(h);
  }

  return (
    <div
      ref={sheetRef}
      className={cn(
        "map-house-sheet",
        overview && "is-cluster-overview",
        dragH !== null && "is-dragging",
        sheetH !== null && "is-raised",
        !overview && openH > 0 && "is-open",
      )}
      role="dialog"
      aria-labelledby={labelId}
      tabIndex={-1}
      style={{
        height: overview ? (displayH ?? "var(--map-cluster-sheet-h, 70%)") : (displayH ?? 0),
      }}
      dir="rtl"
      onPointerDown={onSheetPointerDown}
      onPointerMove={onSheetPointerMove}
      onPointerUp={onSheetPointerUp}
      onPointerCancel={onSheetPointerUp}
      onTransitionEnd={onHeightTransitionEnd}
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
          <div id={labelId} className="map-house-sheet-cluster flex min-h-0 flex-1 flex-col">
            <div className="map-house-sheet-cluster-head shrink-0">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="map-house-sheet-kicker">{address}</p>
                  <p className="map-house-sheet-sub">{clusterHouses.length} בתים בכתובת זו</p>
                </div>
                {actionMenu}
              </div>
            </div>
            <div className="map-house-sheet-cluster-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <ClusterHouseList
                houses={clusterHouses}
                selectedId={house.id}
                now={clusterNow}
                skipped={isSkipped}
                filteredOut={isFilteredOut}
                visited={visited}
                onSelect={(id) => onSelectClusterHouse?.(id)}
              />
            </div>
          </div>
        ) : (
          <>
            <span id={labelId} className="sr-only">
              {houseHeadline(house)}
            </span>
            <div className="map-house-sheet-cards">
              <ClusterHouseSwipeArea
                canPrev={canPrevCluster}
                canNext={canNextCluster}
                onPrev={() => onAdjacentClusterHouse?.(-1)}
                onNext={() => onAdjacentClusterHouse?.(1)}
              >
                <section className="map-house-sheet-card is-on">
                  {multi && clusterIndex != null ? (
                    <ClusterHouseNav
                      houses={clusterHouses}
                      selectedId={house.id}
                      onPrev={() => onAdjacentClusterHouse?.(-1)}
                      onNext={() => onAdjacentClusterHouse?.(1)}
                      onBack={() => onBackToClusterOverview?.()}
                    />
                  ) : null}
                  <FilterMismatchNotice
                    reasons={filterMismatchReasons}
                    skipMeta={skipMeta}
                    onRestoreRoute={onRestoreRoute}
                  />
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
              </ClusterHouseSwipeArea>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
