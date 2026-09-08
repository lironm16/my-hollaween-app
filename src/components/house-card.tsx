"use client";

import { Card } from "@/components/ui/card";
import { HouseActionBar } from "@/components/house-action-bar";
import { HouseDetails } from "@/components/house-details";
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
  canEdit = false,
  admin = false,
  onShowOnMap,
  onOpen,
  editing = false,
  onToggleEdit,
}: {
  house: PublicHouse;
  distanceM?: number;
  catalogSource?: string | null;
  liked?: boolean;
  onToggleLike?: () => void;
  visited?: boolean;
  onToggleVisited?: () => void;
  canEdit?: boolean;
  admin?: boolean;
  onShowOnMap?: () => void;
  onOpen?: () => void;
  editing?: boolean;
  onToggleEdit?: () => void;
}) {
  function open() {
    onOpen?.();
  }

  return (
    <Card
      size="sm"
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? "פתיחת פרטי הבית" : undefined}
      className={cn(
        "border-orange-500/15 bg-[#1d1028]/90 text-base",
        onOpen && "cursor-pointer transition hover:border-orange-400/50 hover:bg-[#261536]",
      )}
      onClick={(event) => {
        if (!onOpen || isCardInteractive(event.target)) return;
        open();
      }}
      onKeyDown={(event) => {
        if (!onOpen) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        if (isCardInteractive(event.target)) return;
        event.preventDefault();
        open();
      }}
    >
      <div className="house-list-card-chrome">
        <HouseActionBar
          house={house}
          liked={liked}
          visited={visited}
          onToggleLike={onToggleLike}
          onToggleVisited={onToggleVisited}
          onToggleEdit={canEdit ? onToggleEdit : undefined}
          onShowOnMap={onShowOnMap}
          editing={editing}
        />
      </div>
      <div className="px-3 pb-1">
        {house.status === "pending" ? (
          <p className="mb-3 rounded-lg bg-violet-950/70 px-3 py-2 text-base text-violet-100">
            {admin
              ? "בית ממתין לאישור — עדיין לא במפה הציבורית."
              : "הבית הזה עדיין לא במפה הציבורית. אם זה הבית שלכם, מנהל יכול לאשר אותו."}
          </p>
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
          compact
        />
      </div>
    </Card>
  );
}
