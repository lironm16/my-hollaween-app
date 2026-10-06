"use client";

import { useEffect, useState } from "react";
import { HouseEditModal } from "@/components/house-edit-modal";
import { Button } from "@/components/ui/button";
import { houseHeadline } from "@/lib/labels";
import { clusterBulkActionSubtitle } from "@/lib/school-campus";
import type { PublicHouse } from "@/lib/types";

export function VisitSkipConflictDialog({
  open,
  kind,
  house,
  cluster = false,
  clusterHouses,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  kind: "visit" | "skip" | "visit-all" | "skip-all" | null;
  house: PublicHouse | null;
  /** Multi-house / school cluster bulk action — generic copy. */
  cluster?: boolean;
  clusterHouses?: PublicHouse[];
  onConfirm: (dismissFuture: boolean) => void;
  onCancel: () => void;
}) {
  const [dismissFuture, setDismissFuture] = useState(false);

  useEffect(() => {
    if (!open) setDismissFuture(false);
  }, [open, house?.id, kind, cluster]);

  if (!house || !kind) return null;

  const markingVisit = kind === "visit" || kind === "visit-all";
  const title = cluster
    ? markingVisit
      ? "לסמן ביקרתם בהכל?"
      : "לדלג על הכל?"
    : markingVisit
      ? "לסמן ביקור?"
      : "לדלג על הבית?";
  const body = cluster
    ? markingVisit
      ? "לפחות אחד מהבתים בכתובת הזו מסומן כ«דילגתי». סימון «ביקרתי הכל» יסיר את סימוני הדילוג על כל הבתים."
      : "לפחות אחד מהבתים בכתובת הזו מסומן כ«ביקרתי». «דילוג על הכל» יסיר את סימוני הביקור על כל הבתים."
    : markingVisit
      ? `סימון «ביקרתם» יסיר את סימון «דילגתם» על ${houseHeadline(house)}.`
      : `«דילוג על בית» יסיר את סימון «ביקרתם» על ${houseHeadline(house)}.`;

  const subtitle =
    cluster && clusterHouses && clusterHouses.length > 0
      ? clusterBulkActionSubtitle(clusterHouses)
      : houseHeadline(house);

  return (
    <HouseEditModal open={open} onClose={onCancel} title={title} subtitle={subtitle}>
      <div className="space-y-4">
        <p className="text-base leading-relaxed text-violet-100 [overflow-wrap:anywhere]">{body}</p>
        <label className="flex cursor-pointer items-start gap-2 text-base text-violet-200">
          <input
            type="checkbox"
            checked={dismissFuture}
            onChange={(event) => setDismissFuture(event.target.checked)}
            className="mt-1 size-4 shrink-0 accent-orange-500"
          />
          <span>לא להציג שוב</span>
        </label>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="min-w-0 flex-1 text-lg" onClick={onCancel}>
            ביטול
          </Button>
          <Button
            type="button"
            className="min-w-0 flex-1 bg-orange-500 text-lg text-black hover:bg-orange-400"
            onClick={() => onConfirm(dismissFuture)}
          >
            אישור
          </Button>
        </div>
      </div>
    </HouseEditModal>
  );
}
