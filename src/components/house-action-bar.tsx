"use client";

import { Heart, Navigation, Pencil, Share2 } from "lucide-react";
import { VisitedCheck } from "@/components/visited-check";
import { toast } from "sonner";
import { houseMapsUrl, shareHouse } from "@/lib/nav-links";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseActionBar({
  house,
  liked,
  visited,
  onToggleLike,
  onToggleVisited,
  onToggleEdit,
  editing,
}: {
  house: PublicHouse;
  liked?: boolean;
  visited?: boolean;
  onToggleLike?: () => void;
  onToggleVisited?: () => void;
  onToggleEdit?: () => void;
  editing?: boolean;
}) {
  return (
    <div className="house-action-bar" dir="rtl">
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
          aria-label={liked ? "הסירו מהשמורים" : "שמרו את הבית"}
          aria-pressed={liked}
          title="אהבתי"
          onClick={onToggleLike}
        >
          <Heart className={cn("size-6", liked && "fill-current")} strokeWidth={2.2} />
        </button>
      ) : null}
      {onToggleVisited ? (
        <button
          type="button"
          className={cn("house-action-btn", visited && "is-visited")}
          aria-label={visited ? "סמנו כלא ביקרתי" : "סמנו שביקרתי"}
          aria-pressed={visited}
          title="ביקרתי"
          onClick={onToggleVisited}
        >
          <VisitedCheck visited={visited} inButton />
        </button>
      ) : null}
      {onToggleEdit ? (
        <button
          type="button"
          className={cn("house-action-btn", editing && "is-edit")}
          aria-label={editing ? "סגירת עריכה" : "עריכת הבית"}
          aria-pressed={editing}
          title="עריכה"
          onClick={onToggleEdit}
        >
          <Pencil className="size-6" strokeWidth={2.2} />
        </button>
      ) : null}
    </div>
  );
}
