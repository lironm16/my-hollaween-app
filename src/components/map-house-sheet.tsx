"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { HouseActionBar } from "@/components/house-action-bar";
import { HouseDetails } from "@/components/house-details";
import { HouseTags } from "@/components/house-tags";
import { formatDisplayAddress } from "@/lib/config";
import { effectiveVisit } from "@/lib/house-state";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

const PEEK_PX = 340;
const FULL_VH = 0.88;

export function MapHouseSheet({
  house,
  clusterHouses,
  onSelectHouse,
  onClose,
  start = "peek",
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
  start?: "peek" | "full";
  liked?: boolean;
  onToggleLike?: () => void;
  visited?: boolean;
  onToggleVisited?: () => void;
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
  const clusterKey = clusterHouses.map((item) => item.id).join(",");
  const [snap, setSnap] = useState<"peek" | "full">(start);
  const drag = useRef<{ y: number; h: number; moved: boolean } | null>(null);
  const skipClick = useRef(false);
  const [dragH, setDragH] = useState<number | null>(null);
  const multi = clusterHouses.length > 1;
  const address = formatDisplayAddress(house);

  useEffect(() => {
    setSnap(start);
  }, [clusterKey, start]);

  useEffect(() => {
    const peek = Math.min(PEEK_PX, Math.round(window.innerHeight * 0.42));
    const full = Math.round(window.innerHeight * FULL_VH);
    const h = dragH ?? (snap === "full" ? full : peek);
    document.documentElement.style.setProperty("--map-sheet-h", `${h}px`);
    return () => {
      document.documentElement.style.removeProperty("--map-sheet-h");
    };
  }, [snap, dragH]);

  function snapHeight(next: "peek" | "full") {
    const peek = Math.min(PEEK_PX, Math.round(window.innerHeight * 0.42));
    return next === "full" ? Math.round(window.innerHeight * FULL_VH) : peek;
  }

  function onHandlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const peek = snapHeight("peek");
    const full = snapHeight("full");
    drag.current = { y: event.clientY, h: snap === "full" ? full : peek, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onHandlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    if (Math.abs(event.clientY - drag.current.y) > 6) drag.current.moved = true;
    const peek = snapHeight("peek");
    const full = snapHeight("full");
    const next = Math.min(full, Math.max(120, drag.current.h + (drag.current.y - event.clientY)));
    setDragH(next);
  }

  function onHandlePointerUp() {
    if (!drag.current) return;
    const peek = snapHeight("peek");
    const full = snapHeight("full");
    const h = dragH ?? (snap === "full" ? full : peek);
    if (drag.current.moved) skipClick.current = true;
    drag.current = null;
    setDragH(null);
    if (h < peek * 0.55) {
      onClose();
      return;
    }
    setSnap(h > (peek + full) / 2 ? "full" : "peek");
  }

  const height = dragH ?? snapHeight(snap);
  const closed = effectiveVisit(house) === "closed";

  return (
    <div
      className={cn(
        "map-house-sheet",
        snap === "full" && "is-full",
        dragH !== null && "is-dragging",
      )}
      role="dialog"
      aria-labelledby={labelId}
      style={{ height }}
      dir="rtl"
    >
      <div
        className="map-house-sheet-handle-hit"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
        onClick={() => {
          if (skipClick.current) {
            skipClick.current = false;
            return;
          }
          setSnap((now) => (now === "peek" ? "full" : "peek"));
        }}
      >
        <div className="map-house-sheet-handle" />
      </div>
      <div className="map-house-sheet-top">
        <HouseActionBar
          house={house}
          liked={liked}
          visited={visited}
          onToggleLike={onToggleLike}
          onToggleVisited={onToggleVisited}
          onClose={onClose}
        />
      </div>
      <div className="map-house-sheet-body">
        {multi ? (
          <>
            <p id={labelId} className="map-house-sheet-kicker">
              {address}
            </p>
            <p className="map-house-sheet-sub">{clusterHouses.length} דירות בבניין · בחרו דירה</p>
            <ul className="map-house-sheet-apts">
              {clusterHouses.map((item) => {
                const itemClosed = effectiveVisit(item) === "closed";
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={cn(
                        "map-house-sheet-apt",
                        item.id === house.id && "is-on",
                      )}
                      onClick={() => {
                        onSelectHouse(item);
                        if (item.id === house.id) setSnap("full");
                      }}
                    >
                      <span className="map-house-sheet-apt-title">{houseHeadline(item)}</span>
                      {item.arrival ? (
                        <span className="map-house-sheet-apt-meta">{item.arrival}</span>
                      ) : null}
                      <span className="map-house-sheet-apt-tags">
                        <HouseTags house={item} />
                      </span>
                      {itemClosed ? (
                        <span className="map-house-sheet-sold">נגמר המלאי</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <>
            <h2 id={labelId} className="map-house-sheet-title">
              {houseHeadline(house)}
            </h2>
            <p className="map-house-sheet-sub">{address}</p>
            {snap === "peek" ? (
              <>
                {house.arrival ? <p className="map-house-sheet-arrival">{house.arrival}</p> : null}
                <div className="map-house-sheet-tags">
                  <HouseTags house={house} />
                </div>
                {closed ? <p className="map-house-sheet-sold">נגמר המלאי</p> : null}
              </>
            ) : null}
          </>
        )}
        {snap === "full" ? (
          <div className="map-house-sheet-full">
            {pendingNote}
            {frozenNote}
            <HouseDetails
              house={house}
              catalogSource={catalogSource}
              liked={liked}
              onToggleLike={onToggleLike}
              visited={visited}
              onToggleVisited={onToggleVisited}
              managerEditCode={managerEditCode}
              canEdit={canEdit}
              editing={editing}
              onToggleEdit={onToggleEdit}
              extra={extra}
              chrome="sheet"
            />
          </div>
        ) : (
          <button
            type="button"
            className="map-house-sheet-more"
            onClick={() => setSnap("full")}
          >
            משכו למעלה לכל הפרטים
          </button>
        )}
      </div>
    </div>
  );
}
