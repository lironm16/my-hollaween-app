"use client";

import { useEffect, useState } from "react";
import { HouseEditModal } from "@/components/house-edit-modal";
import { HelpText } from "@/components/help-text";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import type { PublicHouse } from "@/lib/types";

export function VisitSkipConflictDialog({
  open,
  kind,
  house,
  cluster = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  kind: "visit" | "skip" | "visit-all" | "skip-all" | null;
  house: PublicHouse | null;
  /** Multi-house / school cluster bulk action — generic copy. */
  cluster?: boolean;
  onConfirm: (dismissFuture: boolean) => void;
  onCancel: () => void;
}) {
  const { dir, t } = useLocale();
  const [dismissFuture, setDismissFuture] = useState(false);

  useEffect(() => {
    if (!open) setDismissFuture(false);
  }, [open, house?.id, kind, cluster]);

  if (!house || !kind) return null;

  const markingVisit = kind === "visit" || kind === "visit-all";
  const title = cluster
    ? markingVisit
      ? t("visitSkipConflict.visitAllTitle")
      : t("visitSkipConflict.skipAllTitle")
    : markingVisit
      ? t("visitSkipConflict.visitTitle")
      : t("visitSkipConflict.skipTitle");
  const body = cluster
    ? markingVisit
      ? t("visitSkipConflict.visitAllBody")
      : t("visitSkipConflict.skipAllBody")
    : markingVisit
      ? t("visitSkipConflict.visitOneBody")
      : t("visitSkipConflict.skipOneBody");

  return (
    <HouseEditModal open={open} onClose={onCancel} title={title}>
      <div className="space-y-4">
        <p className="text-start text-base leading-relaxed text-violet-100 [overflow-wrap:anywhere]">
          <HelpText>{body}</HelpText>
        </p>
        <label className="flex cursor-pointer items-start gap-2 text-start text-base text-violet-200">
          <input
            type="checkbox"
            checked={dismissFuture}
            onChange={(event) => setDismissFuture(event.target.checked)}
            className="mt-1 size-4 shrink-0 accent-orange-500"
          />
          <span>{t("visitSkipConflict.dismissFuture")}</span>
        </label>
        <div className={dir === "ltr" ? "flex flex-row-reverse gap-2 pt-1" : "flex gap-2 pt-1"}>
          <Button
            type="button"
            className="min-w-0 flex-1 bg-orange-500 text-lg text-black hover:bg-orange-400"
            onClick={() => onConfirm(dismissFuture)}
          >
            {t("visitSkipConflict.confirm")}
          </Button>
          <Button type="button" variant="outline" className="min-w-0 flex-1 text-lg" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </HouseEditModal>
  );
}
