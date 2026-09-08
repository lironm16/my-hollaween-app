"use client";

import { Heart, MapPinned, Navigation, Pencil, Share2 } from "lucide-react";
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
              className={cn("house-action-btn has-count", liked && "is-on")}
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
              <HouseActionCount n={Math.max(traffic.saved, liked ? 1 : 0)} />
            </button>
          ) : null}
          {onToggleVisited ? (
            <button
              type="button"
              className={cn("house-action-btn has-count", visited && "is-visited")}
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
              <HouseActionCount n={Math.max(traffic.visited, visited ? 1 : 0)} />
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
