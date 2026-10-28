"use client";

import { Pencil, Zap } from "lucide-react";
import { HouseEditModal } from "@/components/house-edit-modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";

export function EditChoiceDialog({
  open,
  quickAvailable,
  onQuick,
  onFull,
  onClose,
}: {
  open: boolean;
  quickAvailable: boolean;
  onQuick: () => void;
  onFull: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  return (
    <HouseEditModal open={open} onClose={onClose} title={t("editChoice.title")}>
      <div className="space-y-2">
        {quickAvailable ? (
          <Button
            type="button"
            className="h-11 w-full justify-center gap-2 bg-orange-500 text-base text-black hover:bg-orange-400"
            onClick={onQuick}
          >
            <Zap className="size-4" />
            {t("editChoice.quick")}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-center gap-2 border-orange-400/40 text-orange-100"
          onClick={onFull}
        >
          <Pencil className="size-4" />
          {t("editChoice.full")}
        </Button>
        <Button type="button" variant="ghost" className="h-10 w-full text-violet-300" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      </div>
    </HouseEditModal>
  );
}
