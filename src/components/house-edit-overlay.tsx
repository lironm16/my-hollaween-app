"use client";

import { Zap } from "lucide-react";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import { NightDesk } from "@/components/night-desk";
import { Button } from "@/components/ui/button";
import type { PublicHouse } from "@/lib/types";

export function HouseEditOverlay({
  house,
  editCode,
  admin,
  allowDelete,
  quickAvailable,
  onClose,
  onOpenQuick,
  onUpdated,
  onDeleted,
}: {
  house: PublicHouse;
  editCode?: string;
  admin?: boolean;
  allowDelete?: boolean;
  quickAvailable?: boolean;
  onClose: () => void;
  onOpenQuick?: () => void;
  onUpdated: (house: PublicHouse) => void;
  onDeleted?: () => void;
}) {
  return (
    <div className="house-edit-overlay" dir="rtl" role="dialog" aria-modal="true" aria-label="עריכת בית">
      <OverlayCloseBar
        onClose={onClose}
        title="עריכת בית"
        subtitle={house.name}
        trailing={
          quickAvailable && onOpenQuick ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 border-orange-400/40 px-2.5 text-orange-100"
              onClick={onOpenQuick}
            >
              <Zap className="size-3.5" />
              עדכון מהיר
            </Button>
          ) : null
        }
      />
      <div className="house-edit-overlay-body">
        <div className="mx-auto w-full max-w-lg space-y-4 px-4 pb-8">
          <NightDesk
            house={house}
            admin={admin}
            allowDelete={allowDelete}
            editCode={editCode}
            onCancel={onClose}
            onDeleted={onDeleted}
            onUpdated={onUpdated}
          />
        </div>
      </div>
    </div>
  );
}
