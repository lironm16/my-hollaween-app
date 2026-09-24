"use client";

import { HouseEditModal } from "@/components/house-edit-modal";
import { Button } from "@/components/ui/button";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

export function GemResetConfirmDialog({
  open,
  house,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  house: PublicHouse | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!house) return null;

  return (
    <HouseEditModal open={open} onClose={onCancel} title="לאפס יהלום?" subtitle={houseHeadline(house)}>
      <div className="space-y-4">
        <p className="text-base leading-relaxed text-violet-100 [overflow-wrap:anywhere]">
          האיסוף של {houseHeadline(house)} יימחק מהמכשיר — אפשר לצוד את היהלום מחדש.
        </p>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="min-w-0 flex-1 text-lg" onClick={onCancel}>
            ביטול
          </Button>
          <Button
            type="button"
            className="min-w-0 flex-1 bg-orange-500 text-lg text-black hover:bg-orange-400"
            onClick={onConfirm}
          >
            איפוס
          </Button>
        </div>
      </div>
    </HouseEditModal>
  );
}
