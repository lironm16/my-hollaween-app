"use client";

import { OverlayCloseBar } from "@/components/overlay-close-button";
import { NightDesk } from "@/components/night-desk";
import { useLocale } from "@/hooks/use-locale";
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
  const { dir, t } = useLocale();
  return (
    <div
      className="house-edit-overlay"
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-label={t("houseEditOverlay.title")}
    >
      <OverlayCloseBar onClose={onClose} title={t("houseEditOverlay.title")} />
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
