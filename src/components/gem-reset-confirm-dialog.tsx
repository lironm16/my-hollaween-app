"use client";

import { HouseEditModal } from "@/components/house-edit-modal";
import { Button } from "@/components/ui/button";
import { clusterBoothLabel } from "@/lib/cluster-booth";
import {
  GEM_RESET_BODY_ONE_HE,
  GEM_RESET_CLUSTER_BODY_HE,
  GEM_RESET_CLUSTER_TITLE_HE,
  GEM_RESET_TITLE_HE,
} from "@/lib/gem-hunt-copy";
import { houseHeadline } from "@/lib/labels";
import { clusterBulkActionSubtitle } from "@/lib/school-campus";
import type { PublicHouse } from "@/lib/types";

export function GemResetConfirmDialog({
  open,
  house,
  cluster = false,
  clusterHouses,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  house: PublicHouse | null;
  /** Reset every inner house at this address (cluster ⋮ «מצאתי הכל»). */
  cluster?: boolean;
  clusterHouses?: PublicHouse[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!house) return null;

  const clusterMode = cluster && clusterHouses != null && clusterHouses.length >= 2;
  const title = clusterMode ? GEM_RESET_CLUSTER_TITLE_HE : GEM_RESET_TITLE_HE;
  const subtitle = clusterMode
    ? clusterBulkActionSubtitle(clusterHouses)
    : houseHeadline(house);

  return (
    <HouseEditModal open={open} onClose={onCancel} title={title} subtitle={subtitle}>
      <div className="space-y-4">
        {clusterMode ? (
          <>
            <p className="text-base leading-relaxed text-violet-100 [overflow-wrap:anywhere]">
              {GEM_RESET_CLUSTER_BODY_HE}
            </p>
            <ul
              className="max-h-40 space-y-1.5 overflow-y-auto overscroll-contain text-sm leading-snug text-violet-200/95"
              dir="rtl"
            >
              {clusterHouses.map((row) => {
                const booth = clusterBoothLabel(row, clusterHouses);
                return (
                  <li key={row.id} className="[overflow-wrap:anywhere]">
                    {houseHeadline(row)}
                    {booth ? <span className="text-violet-300/80"> · {booth}</span> : null}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="text-base leading-relaxed text-violet-100 [overflow-wrap:anywhere]">
            {GEM_RESET_BODY_ONE_HE}
          </p>
        )}
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
