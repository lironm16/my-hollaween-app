"use client";

import { X } from "lucide-react";
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
      <div className="house-edit-overlay-bar">
        <button
          type="button"
          className="house-edit-overlay-close"
          aria-label="סגירה"
          onClick={onClose}
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="house-edit-overlay-body">
        <div className="mx-auto w-full max-w-lg space-y-4 px-4 pb-8">
          <div>
            <h1 className="font-display text-2xl text-orange-300">עריכת בית</h1>
            <p className="mt-1 text-base text-violet-200">{house.name}</p>
          </div>
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
