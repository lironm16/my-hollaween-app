"use client";

import { Card } from "@/components/ui/card";
import { HouseActionBar } from "@/components/house-action-bar";
import { HouseDetails } from "@/components/house-details";
import { HouseSkippedBanner } from "@/components/house-skipped-banner";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

function isCardInteractive(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest("button, a, input, label, textarea, select, form"))
  );
}

export function HouseCard({
  house,
  distanceM,
  catalogSource,
  liked,
  onToggleLike,
  visited,
  onToggleVisited,
  onSkip,
  onRestoreRoute,
  skipped = false,
  skipMeta,
  canEdit = false,
  editCode,
  admin = false,
  onShowOnMap,
  onOpen,
  editing = false,
  onToggleEdit,
  expanded = false,
  index,
}: {
  house: PublicHouse;
  distanceM?: number;
  catalogSource?: string | null;
  liked?: boolean;
  onToggleLike?: () => void;
  visited?: boolean;
  onToggleVisited?: () => void;
  onSkip?: () => void;
  onRestoreRoute?: () => void;
  skipped?: boolean;
  skipMeta?: SkippedHouseMeta;
  canEdit?: boolean;
  editCode?: string;
  admin?: boolean;
  onShowOnMap?: () => void;
  onOpen?: () => void;
  editing?: boolean;
  onToggleEdit?: () => void;
  /** Show full details inline without opening a sheet. */
  expanded?: boolean;
  index?: number;
}) {
  function open() {
    onOpen?.();
  }

  const interactive = Boolean(onOpen) && !expanded;

  return (
    <Card
      size="sm"
      className={cn(
        "house-list-card overflow-visible bg-[#1d1028]/90 text-base",
        visited ? "is-visited ring-0" : "border-orange-500/15",
        interactive && "cursor-pointer transition hover:bg-[#261536]",
        interactive && !visited && "hover:border-orange-400/50",
      )}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? "פתיחת פרטי הבית" : undefined}
      onClick={
        interactive
          ? (event) => {
              if (isCardInteractive(event.target)) return;
              open();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              if (isCardInteractive(event.target)) return;
              event.preventDefault();
              open();
            }
          : undefined
      }
    >
      <div className="px-3 pb-1 pt-2">
        {skipped ? (
          <HouseSkippedBanner meta={skipMeta} onRestore={onRestoreRoute} />
        ) : null}
        <HouseDetails
          house={house}
          distanceM={distanceM}
          catalogSource={catalogSource}
          liked={liked}
          onToggleLike={onToggleLike}
          visited={visited}
          onToggleVisited={onToggleVisited}
          chrome="sheet"
          compact={!expanded}
          index={index}
          onReadMore={!expanded && onOpen ? open : undefined}
          headerMenu={
            <HouseActionBar
              house={house}
              liked={liked}
              visited={visited}
              onToggleLike={onToggleLike}
              onToggleVisited={onToggleVisited}
              onSkip={skipped ? undefined : onSkip}
              onRestoreRoute={skipped ? onRestoreRoute : undefined}
              skipped={skipped}
              onToggleEdit={canEdit ? onToggleEdit : undefined}
              editCode={editCode}
              onShowOnMap={onShowOnMap}
              editing={editing}
              menuPlacement="bottom"
            />
          }
        />
      </div>
    </Card>
  );
}
