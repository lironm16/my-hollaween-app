"use client";

import { Heart, List, MapPinned, Navigation, Pencil, Share2, Undo2, SkipForward } from "lucide-react";
import { VisitedCheck } from "@/components/visited-check";
import { useHouseTraffic } from "@/hooks/use-house-traffic";
import { toast } from "sonner";
import { houseMapsUrl, shareHouse } from "@/lib/nav-links";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function formatActionCount(n: number) {
  const value = Math.max(0, Math.floor(n) || 0);
  return value > 999 ? "999+" : String(value);
}

/** Neighborhood count next to heart / check — no extra label. */
export function HouseActionCount({ n }: { n: number }) {
  return (
    <span className="house-action-count" aria-hidden="true">
      {formatActionCount(n)}
    </span>
  );
}

export function HouseActionBar({
  house,
  liked,
  visited,
  onToggleLike,
  onToggleVisited,
  onToggleEdit,
  onShowOnMap,
  onShowInList,
  onSkip,
  onRestoreRoute,
  skipped,
  editing,
  navOnly,
  showNav = true,
}: {
  house: PublicHouse;
  liked?: boolean;
  visited?: boolean;
  onToggleLike?: () => void;
  onToggleVisited?: () => void;
  onToggleEdit?: () => void;
  onShowOnMap?: () => void;
  onShowInList?: () => void;
  onSkip?: () => void;
  onRestoreRoute?: () => void;
  skipped?: boolean;
  editing?: boolean;
  navOnly?: boolean;
  showNav?: boolean;
}) {
  const { trafficFor } = useHouseTraffic();
  const traffic = trafficFor(house.id);

  return (
    <div className="house-action-bar" dir="rtl">
      {showNav ? (
        <a
          href={houseMapsUrl(house)}
          target="_blank"
          rel="noreferrer"
          className="house-action-btn"
          aria-label="ניווט ב-Google Maps"
          title="Google Maps"
        >
          <Navigation className="size-6" strokeWidth={2.2} />
        </a>
      ) : null}
      {onShowOnMap ? (
        <button
          type="button"
          className="house-action-btn"
          aria-label="פתיחה במפה"
          title="מפה"
          onClick={onShowOnMap}
        >
          <MapPinned className="size-6" strokeWidth={2.2} />
        </button>
      ) : null}
      {onShowInList ? (
        <button
          type="button"
          className="house-action-btn"
          aria-label="פתיחה ברשימה"
          title="רשימה"
          onClick={onShowInList}
        >
          <List className="size-6" strokeWidth={2.2} />
        </button>
      ) : null}
      {navOnly ? null : (
        <>
          <button
            type="button"
            className="house-action-btn"
            aria-label="שיתוף הבית"
            title="שיתוף"
            onClick={() => {
              void shareHouse(house).then((result) => {
                if (result === "copied") toast.success("הקישור הועתק");
                if (result === "failed") toast.error("לא הצלחנו לשתף");
              });
            }}
          >
            <Share2 className="size-6" strokeWidth={2.2} />
          </button>
          {onToggleLike ? (
            <button
              type="button"
              className={cn("house-action-btn", liked && "is-on")}
              aria-label={
                liked
                  ? `הסירו מהשמורים, ${traffic.saved} שמרו`
                  : `שמרו את הבית, ${traffic.saved} שמרו`
              }
              aria-pressed={liked}
              title="שמורים"
              onClick={onToggleLike}
            >
              <Heart className={cn("size-6", liked && "fill-current")} strokeWidth={2.2} />
            </button>
          ) : null}
          {onToggleVisited ? (
            <button
              type="button"
              className={cn("house-action-btn", visited && "is-visited")}
              aria-label={
                visited
                  ? `סמנו כלא ביקרתי, ${traffic.visited} ביקרו`
                  : `סמנו שביקרתי, ${traffic.visited} ביקרו`
              }
              aria-pressed={visited}
              title="ביקרתי"
              onClick={onToggleVisited}
            >
              <VisitedCheck visited={visited} inButton />
            </button>
          ) : null}
          {onSkip ? (
            <button
              type="button"
              className="house-action-btn"
              aria-label="דילוג על הבית במסלול"
              title="דילוג"
              onClick={(event) => {
                event.stopPropagation();
                onSkip();
              }}
            >
              <SkipForward className="size-6" strokeWidth={2.2} />
            </button>
          ) : null}
          {onRestoreRoute ? (
            <button
              type="button"
              className={cn("house-action-btn", skipped && "is-on")}
              aria-label="החזרה למסלול"
              title="החזר למסלול"
              onClick={(event) => {
                event.stopPropagation();
                onRestoreRoute();
              }}
            >
              <Undo2 className="size-6" strokeWidth={2.2} />
            </button>
          ) : null}
          {onToggleEdit ? (
            <button
              type="button"
              className={cn("house-action-btn", editing && "is-edit")}
              aria-label={editing ? "סגירת עריכה" : "עריכת הבית"}
              aria-pressed={editing}
              title="עריכה"
              onClick={(event) => {
                event.stopPropagation();
                onToggleEdit();
              }}
            >
              <Pencil className="size-6" strokeWidth={2.2} />
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
