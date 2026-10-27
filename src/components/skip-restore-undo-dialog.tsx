"use client";

import { Button } from "@/components/ui/button";
import { HouseEditModal } from "@/components/house-edit-modal";
import { useLocale } from "@/hooks/use-locale";
import { localizedSkipRestoreUndoPromptMessage } from "@/lib/i18n/skip-copy";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SkipRestoreUndoDialog({
  house,
  meta,
  open,
  onConfirmUnskip,
  onDismiss,
}: {
  house: PublicHouse;
  meta: SkippedHouseMeta;
  open: boolean;
  onConfirmUnskip: () => void;
  onDismiss: () => void;
}) {
  const { dir, locale, t } = useLocale();
  return (
    <HouseEditModal open={open} onClose={onDismiss} title={t("skipRestore.title")}>
      <div className="space-y-4">
        <p className="text-start text-lg leading-relaxed text-violet-100">
          {localizedSkipRestoreUndoPromptMessage(locale, house, meta)}
        </p>
        <div className={cn("grid grid-cols-2 gap-2 pt-1", dir === "ltr" && "[direction:ltr]")}>
          <Button
            type="button"
            className={cn(
              "h-11 bg-orange-500 px-4 text-black hover:bg-orange-400",
              dir === "ltr" && "order-2",
            )}
            onClick={onConfirmUnskip}
          >
            {t("skipRestore.undoSkip")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn("h-11 px-4", dir === "ltr" && "order-1")}
            onClick={onDismiss}
          >
            {t("skipRestore.keepSkip")}
          </Button>
        </div>
      </div>
    </HouseEditModal>
  );
}
