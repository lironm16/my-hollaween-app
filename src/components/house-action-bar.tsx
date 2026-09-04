"use client";

import { CheckCircle2, Heart, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { houseWazeUrl, shareHouse } from "@/lib/nav-links";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

function WazeGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path
        fill="currentColor"
        d="M12 2.2c-4.6 0-8.3 3.4-8.3 8.2 0 5.6 6.8 11.4 8.3 11.4s8.3-5.8 8.3-11.4c0-4.8-3.7-8.2-8.3-8.2zm-2.4 6.3a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7zm4.8 0a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7zM12 16.2c-1.9 0-3.5-.9-4.2-2.2.7.3 1.8.6 4.2.6s3.5-.3 4.2-.6c-.7 1.3-2.3 2.2-4.2 2.2z"
      />
    </svg>
  );
}

export function HouseActionBar({
  house,
  liked,
  visited,
  onToggleLike,
  onToggleVisited,
  onClose,
}: {
  house: PublicHouse;
  liked?: boolean;
  visited?: boolean;
  onToggleLike?: () => void;
  onToggleVisited?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="house-action-bar" dir="rtl">
      <a
        href={houseWazeUrl(house)}
        target="_blank"
        rel="noreferrer"
        className="house-action-btn"
        aria-label="ניווט ב-Waze"
        title="Waze"
      >
        <WazeGlyph />
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
        <Share2 className="size-5" strokeWidth={2.2} />
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
          <Heart className={cn("size-5", liked && "fill-current")} strokeWidth={2.2} />
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
          <CheckCircle2 className={cn("size-5", visited && "fill-current")} strokeWidth={2.2} />
        </button>
      ) : null}
      {onClose ? (
        <button
          type="button"
          className="house-action-btn is-close"
          aria-label="סגירה"
          onClick={onClose}
        >
          <X className="size-5" strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
  );
}
