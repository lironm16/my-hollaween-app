"use client";

import { HouseEditModal } from "@/components/house-edit-modal";
import { Button } from "@/components/ui/button";
import { clusterBoothLabel } from "@/lib/cluster-booth";
import { useLocale } from "@/hooks/use-locale";
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
  /** Reset every inner house at this address (cluster ⋮ **מצאתי הכל**). */
  cluster?: boolean;
  clusterHouses?: PublicHouse[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { dir, locale, t } = useLocale();
  if (!house) return null;

  const clusterMode = cluster && clusterHouses != null && clusterHouses.length >= 2;
  const title = clusterMode ? t("gem.resetClusterTitle") : t("gem.resetTitle");
  const subtitle = clusterMode
    ? clusterBulkActionSubtitle(clusterHouses)
    : houseHeadline(house);

  return (
    <HouseEditModal open={open} onClose={onCancel} title={title} subtitle={subtitle}>
      <div className="space-y-4">
        {clusterMode ? (
          <>
            <p className="text-base leading-relaxed text-violet-100 [overflow-wrap:anywhere]">
              {t("gem.resetClusterBody")}
            </p>
            <ul
              className="max-h-40 space-y-1.5 overflow-y-auto overscroll-contain text-sm leading-snug text-violet-200/95"
              dir={dir}
            >
              {clusterHouses.map((row) => {
                const booth = clusterBoothLabel(row, clusterHouses, locale);
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
            {t("gem.resetBodyOne")}
          </p>
        )}
        <div className="flex gap-3 pt-1" dir={dir}>
          <Button
            type="button"
            className="min-h-12 min-w-0 flex-1 py-3 text-lg font-semibold bg-orange-500 text-black hover:bg-orange-400"
            onClick={onConfirm}
          >
            {t("gem.resetConfirm")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-12 min-w-0 flex-1 py-3 text-lg font-semibold"
            onClick={onCancel}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </HouseEditModal>
  );
}
