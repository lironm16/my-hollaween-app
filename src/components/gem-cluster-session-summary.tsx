"use client";

import Image from "next/image";
import { HouseEditModal } from "@/components/house-edit-modal";
import { Button } from "@/components/ui/button";
import { gemClusterSessionSummaryHe } from "@/lib/gem-hunt-copy";
import { gemLabelHe, gemMonsterMeta } from "@/lib/gem-monsters";
import type { GemMonsterId } from "@/lib/gem-monsters";
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
}: {
  open: boolean;
  catches: GemClusterSessionCatch[];
  onClose: () => void;
}) {
  if (!open || catches.length === 0) return null;

  const newCount = catches.filter((c) => c.isNew).length;

  return (
    <HouseEditModal
      open={open}
      onClose={onClose}
      title={gemClusterSessionSummaryHe(catches.length, newCount)}
      subtitle="סיום מציאת שדונים בכתובת"
    >
      <div className="space-y-4">
        <ul
          className="flex flex-wrap items-start justify-center gap-3 py-1"
          dir="rtl"
          aria-label="שדונים שנמצאו במפגש"
        >
          {catches.map((item, index) => {
            const meta = gemMonsterMeta(item.monsterId);
            return (
            <li
              key={item.house.id}
              className="gem-cluster-session-summary__slot flex max-w-[5.5rem] flex-col items-center gap-1 text-center"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="gem-cluster-session-summary__poster shrink-0" aria-hidden>
                <Image
                  src={meta.posterPath}
                  alt=""
                  width={88}
                  height={88}
                  className="gem-cluster-session-summary__poster-img"
                />
              </div>
              <span className="text-[11px] font-semibold leading-tight text-amber-100/95 [overflow-wrap:anywhere]">
                {gemLabelHe(item.monsterId)}
              </span>
              {item.isNew ? (
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-100 ring-1 ring-amber-400/45">
                  חדש
                </span>
              ) : null}
            </li>
            );
          })}
        </ul>
        <Button
          type="button"
          className="min-h-12 w-full py-3 text-lg font-semibold bg-orange-500 text-black hover:bg-orange-400"
          onClick={onClose}
        >
          סגור
        </Button>
      </div>
    </HouseEditModal>
  );
}
