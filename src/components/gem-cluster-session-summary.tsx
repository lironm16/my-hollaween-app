"use client";

import Image from "next/image";
import { HouseEditModal } from "@/components/house-edit-modal";
import { Button } from "@/components/ui/button";
import { useGemCopy } from "@/hooks/use-gem-copy";
import { useLocale } from "@/hooks/use-locale";
import { gemMonsterMeta, type GemMonsterId } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";

export type GemClusterSessionCatch = {
  house: PublicHouse;
  monsterId: GemMonsterId;
  isNew: boolean;
};

export function GemClusterSessionSummary({
  open,
  catches,
  onClose,
  onOpenStickerBook,
}: {
  open: boolean;
  catches: GemClusterSessionCatch[];
  onClose: () => void;
  /** Opens the sticker album (replaces plain close). */
  onOpenStickerBook: () => void;
}) {
  const { dir, t } = useLocale();
  const gemCopy = useGemCopy();
  if (!open || catches.length === 0) return null;

  const newCount = catches.filter((c) => c.isNew).length;

  return (
    <HouseEditModal
      open={open}
      onClose={onClose}
      title={gemCopy.clusterSessionTitle(catches.length, newCount)}
    >
      <div className="space-y-4">
        <ul
          className="flex flex-wrap items-start justify-center gap-3 py-1"
          dir={dir}
          aria-label={t("gem.clusterSummaryListAria")}
        >
          {catches.map((item, index) => {
            return (
              <li
                key={item.house.id}
                className="gem-cluster-session-summary__slot flex max-w-[5.5rem] flex-col items-center gap-1 text-center"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <GemClusterCatchPoster monsterId={item.monsterId} />
                <span className="text-[11px] font-semibold leading-tight text-amber-100/95 [overflow-wrap:anywhere]">
                  {gemCopy.petLabel(item.monsterId)}
                </span>
                {item.isNew ? (
                  <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-100 ring-1 ring-amber-400/45">
                    {t("gem.clusterSummaryNewBadge")}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            className="min-h-12 py-3 text-base font-semibold bg-orange-500 text-black hover:bg-orange-400 sm:text-lg"
            onClick={onOpenStickerBook}
          >
            {t("gem.clusterSummaryOpenAlbum")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-12 border-violet-500/40 py-3 text-base font-semibold text-violet-100 hover:bg-violet-500/10 sm:text-lg"
            onClick={onClose}
          >
            {t("common.close")}
          </Button>
        </div>
      </div>
    </HouseEditModal>
  );
}

function GemClusterCatchPoster({ monsterId }: { monsterId: GemMonsterId }) {
  const meta = gemMonsterMeta(monsterId);
  return (
    <div className="gem-cluster-session-summary__poster shrink-0" aria-hidden>
      <Image
        src={meta.posterPath}
        alt=""
        width={88}
        height={88}
        className="gem-cluster-session-summary__poster-img"
      />
    </div>
  );
}
