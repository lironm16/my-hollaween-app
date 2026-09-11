"use client";

import { OverlayCloseBar } from "@/components/overlay-close-button";
import { NightDesk } from "@/components/night-desk";
import type { PublicHouse } from "@/lib/types";

export function HouseEditOverlay({
  house,
  editCode,
  admin,
  allowDelete,
  onClose,
  onUpdated,
  onDeleted,
}: {
  house: PublicHouse;
  editCode?: string;
  admin?: boolean;
  allowDelete?: boolean;
  onClose: () => void;
  onUpdated: (house: PublicHouse) => void;
  onDeleted?: () => void;
}) {
  return (
    <div className="house-edit-overlay" dir="rtl" role="dialog" aria-modal="true" aria-label="עריכת בית">
      <OverlayCloseBar onClose={onClose} title="עריכת בית" subtitle={house.name} />
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
