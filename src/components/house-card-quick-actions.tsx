"use client";

import { Heart } from "lucide-react";
import { ImpMenuActiveGlyph } from "@/components/imp-marker-glyph";
import { ImpOutlineIcon } from "@/components/imp-outline-icon";
import { SavedTrafficIcon, SkipTrafficIcon, VisitedTrafficIcon } from "@/components/traffic-icons";
import { SkipOutlineIcon } from "@/components/skip-icon";
import { VisitedCheck } from "@/components/visited-check";
import { GEM_ACTION_FIND_HE, GEM_FOUND_I_HE } from "@/lib/gem-hunt-copy";
import { cn } from "@/lib/utils";
import type { PointerEvent as ReactPointerEvent } from "react";

const QUICK_ICON_CLASS = "size-7";
const QUICK_ACTIVE_ICON_CLASS = "size-8";

function stopCardPointerBubble(event: ReactPointerEvent) {
  event.stopPropagation();
  if (event.type === "pointerdown") event.preventDefault();
}

function quickBtnClass(active: boolean, tone?: "visited" | "saved" | "gem" | "skipped") {
  return cn(
    "house-card-quick-action-btn",
    active && "is-active",
    active && tone === "visited" && "is-active-visited",
    active && tone === "saved" && "is-active-saved",
    active && tone === "gem" && "is-active-gem",
    active && tone === "skipped" && "is-active-skipped",
  );
}

export function HouseCardQuickActions({
  liked,
  visited,
  gemCollected,
  onToggleLike,
  onToggleVisited,
  onToggleGem,
  onSkip,
  onRestoreRoute,
  skipped,
  className,
}: {
  liked?: boolean;
  visited?: boolean;
  gemCollected?: boolean;
  onToggleLike?: () => void;
  onToggleVisited?: () => void;
  onToggleGem?: () => void;
  onSkip?: () => void;
  onRestoreRoute?: () => void;
  skipped?: boolean;
  className?: string;
}) {
  const hasSkip = Boolean(onSkip || onRestoreRoute);
  const hasAny = Boolean(onToggleVisited || onToggleLike || onToggleGem || hasSkip);
  if (!hasAny) return null;

  return (
    <div className={cn("house-card-quick-actions", className)} role="toolbar" aria-label="פעולות בית">
      {onToggleVisited ? (
        <button
          type="button"
          className={quickBtnClass(Boolean(visited), "visited")}
          aria-label={visited ? "סמנו כלא ביקרתי" : "ביקרתי"}
          aria-pressed={visited}
          onPointerDown={stopCardPointerBubble}
          onClick={(event) => {
            event.stopPropagation();
            onToggleVisited();
          }}
        >
          {visited ? (
            <VisitedTrafficIcon
              className={QUICK_ACTIVE_ICON_CLASS}
              markClassName="size-[1.35rem]"
              markStrokeWidth={4}
            />
          ) : (
            <VisitedCheck visited={false} size="lg" />
          )}
        </button>
      ) : null}
      {onToggleLike ? (
        <button
          type="button"
          className={quickBtnClass(Boolean(liked), "saved")}
          aria-label={liked ? "הסירו אהבתי" : "אהבתי"}
          aria-pressed={liked}
          onPointerDown={stopCardPointerBubble}
          onClick={(event) => {
            event.stopPropagation();
            onToggleLike();
          }}
        >
          {liked ? (
            <SavedTrafficIcon className={QUICK_ACTIVE_ICON_CLASS} markClassName="size-[1.35rem]" />
          ) : (
            <Heart className={QUICK_ICON_CLASS} strokeWidth={2.2} />
          )}
        </button>
      ) : null}
      {hasSkip ? (
        <button
          type="button"
          className={quickBtnClass(Boolean(skipped), "skipped")}
          aria-label={skipped ? "דילגתי — החזרה" : "דילוג"}
          aria-pressed={skipped}
          onPointerDown={stopCardPointerBubble}
          onClick={(event) => {
            event.stopPropagation();
            if (skipped) onRestoreRoute?.();
            else onSkip?.();
          }}
        >
          {skipped ? (
            <SkipTrafficIcon className={QUICK_ACTIVE_ICON_CLASS} markClassName="size-[1.15rem]" />
          ) : (
            <SkipOutlineIcon className={QUICK_ICON_CLASS} />
          )}
        </button>
      ) : null}
      {onToggleGem ? (
        <button
          type="button"
          className={quickBtnClass(Boolean(gemCollected), "gem")}
          aria-label={gemCollected ? GEM_FOUND_I_HE : GEM_ACTION_FIND_HE}
          aria-pressed={gemCollected}
          onPointerDown={stopCardPointerBubble}
          onClick={(event) => {
            event.stopPropagation();
            onToggleGem();
          }}
        >
          {gemCollected ? (
            <ImpMenuActiveGlyph className={QUICK_ICON_CLASS} />
          ) : (
            <ImpOutlineIcon className={QUICK_ICON_CLASS} />
          )}
        </button>
      ) : null}
    </div>
  );
}
