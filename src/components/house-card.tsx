"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CodesCopy } from "@/components/codes-copy";
import { HouseActionBar } from "@/components/house-action-bar";
import { HouseDetails } from "@/components/house-details";
import { NightDesk } from "@/components/night-desk";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseCard({
  house,
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
  onShowOnMap,
}: {
  house: PublicHouse;
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
  onShowOnMap?: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <Card
      size="sm"
      className={cn("border-orange-500/15 bg-[#1d1028]/90 text-base")}
    >
      <div className="house-list-card-chrome">
        <HouseActionBar
          house={house}
          liked={liked}
          visited={visited}
          onToggleLike={onToggleLike}
          onToggleVisited={onToggleVisited}
          onToggleEdit={canEdit ? () => setEditing((value) => !value) : undefined}
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
        {editing && canEdit ? (
          <>
            <p className="font-display text-xl text-orange-300">{houseHeadline(house)}</p>
            <div className="mt-3">
              <CodesCopy editCode={editCode} />
            </div>
            <div className="mt-3">
              <NightDesk
                house={house}
                admin={admin}
                allowDelete
                editCode={editCode}
                onUpdated={(next) => onUpdated?.(next)}
                onDeleted={() => onDeleted?.(house.id)}
              />
            </div>
          </>
        ) : (
          <HouseDetails
            house={house}
            distanceM={distanceM}
            catalogSource={catalogSource}
            liked={liked}
            onToggleLike={onToggleLike}
            visited={visited}
            onToggleVisited={onToggleVisited}
            managerEditCode={editCode}
            chrome="sheet"
          />
        )}
      </div>
    </Card>
  );
}
