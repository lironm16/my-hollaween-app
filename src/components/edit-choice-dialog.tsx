"use client";

import { Pencil, Zap } from "lucide-react";
import { HouseEditModal } from "@/components/house-edit-modal";
import { Button } from "@/components/ui/button";

export function EditChoiceDialog({
  open,
  houseName,
  quickAvailable,
  onQuick,
  onFull,
  onClose,
}: {
  open: boolean;
  houseName: string;
  quickAvailable: boolean;
  onQuick: () => void;
  onFull: () => void;
  onClose: () => void;
}) {
  return (
    <HouseEditModal open={open} onClose={onClose} title="עדכון הבית" subtitle={houseName}>
      <div className="space-y-2">
        {quickAvailable ? (
          <Button
            type="button"
            className="h-11 w-full justify-center gap-2 bg-orange-500 text-base text-black hover:bg-orange-400"
            onClick={onQuick}
          >
            <Zap className="size-4" />
            עדכון מהיר
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-center gap-2 border-orange-400/40 text-orange-100"
          onClick={onFull}
        >
          <Pencil className="size-4" />
          עריכה מלאה
        </Button>
        <Button type="button" variant="ghost" className="h-10 w-full text-violet-300" onClick={onClose}>
          ביטול
        </Button>
      </div>
    </HouseEditModal>
  );
}
