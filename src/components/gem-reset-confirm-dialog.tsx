"use client";

import { HouseEditModal } from "@/components/house-edit-modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
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
  const { dir, t } = useLocale();
  if (!house) return null;

  const clusterMode = cluster && clusterHouses != null && clusterHouses.length >= 2;
  const title = clusterMode ? t("gem.resetClusterTitle") : t("gem.resetTitle");
  const body = clusterMode ? t("gem.resetClusterBody") : t("gem.resetBodyOne");

  return (
    <HouseEditModal open={open} onClose={onCancel} title={title}>
      <div className="space-y-4">
        <p className="text-base leading-relaxed text-violet-100 [overflow-wrap:anywhere]">{body}</p>
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
