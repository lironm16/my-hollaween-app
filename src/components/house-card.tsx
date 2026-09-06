"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { HouseActionBar } from "@/components/house-action-bar";
import { HouseDetails } from "@/components/house-details";
import { NightDesk } from "@/components/night-desk";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseCard({
  house,
  expanded,
  onToggle,
  distanceM,
  catalogSource,
  liked,
  onToggleLike,
  visited,
  onToggleVisited,
  canEdit = false,
  editCode,
  admin = false,
  onUpdated,
  onDeleted,
}: {
  house: PublicHouse;
  expanded?: boolean;
  onToggle?: () => void;
  distanceM?: number;
  catalogSource?: string | null;
  liked?: boolean;
  onToggleLike?: () => void;
  visited?: boolean;
  onToggleVisited?: () => void;
  canEdit?: boolean;
  editCode?: string;
  admin?: boolean;
  onUpdated?: (house: PublicHouse) => void;
  onDeleted?: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!expanded) setEditing(false);
  }, [expanded]);

  return (
    <Card
      size="sm"
      aria-expanded={expanded}
      className={cn(
        "cursor-pointer border-orange-500/15 bg-[#1d1028]/90 text-base transition hover:border-orange-400/50 hover:bg-[#261536]",
      )}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a, input, label, textarea, select, form")) return;
        onToggle?.();
      }}
    >
      <div className="house-list-card-chrome">
        <HouseActionBar
          house={house}
          showNav={false}
          liked={liked}
          visited={visited}
          onToggleLike={onToggleLike}
          onToggleVisited={onToggleVisited}
          onToggleEdit={
            canEdit
              ? () => {
                  if (!expanded) onToggle?.();
                  setEditing((value) => !value);
                }
              : undefined
          }
          editing={editing}
        />
      </div>
      <div className="px-3 pb-1">
        {editing && canEdit ? (
          <NightDesk
            house={house}
            admin={admin}
            allowDelete
            editCode={editCode}
            onUpdated={(next) => onUpdated?.(next)}
            onDeleted={() => onDeleted?.(house.id)}
          />
        ) : (
          <HouseDetails
            house={house}
            compact={!expanded}
            distanceM={distanceM}
            catalogSource={catalogSource}
            liked={liked}
            onToggleLike={onToggleLike}
            visited={visited}
            onToggleVisited={onToggleVisited}
            chrome="sheet"
          />
        )}
      </div>
    </Card>
  );
}
