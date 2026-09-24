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
    <HouseEditModal
      open={open}
      onClose={onCancel}
      title="לאפס איסוף יהלום?"
      subtitle={houseHeadline(house)}
    >
      <div className="space-y-4">
        <p className="text-base leading-relaxed text-violet-100 [overflow-wrap:anywhere]">
          היהלום של {houseHeadline(house)} יימחק מהמכשיר — אפשר לצוד מחדש.
        </p>
        <div className="flex gap-3 pt-1" dir="rtl">
          <Button
            type="button"
            className="min-h-12 min-w-0 flex-1 py-3 text-lg font-semibold bg-orange-500 text-black hover:bg-orange-400"
            onClick={onConfirm}
          >
            אפס
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-12 min-w-0 flex-1 py-3 text-lg font-semibold"
            onClick={onCancel}
          >
            ביטול
          </Button>
        </div>
      </div>
    </HouseEditModal>
  );
}
