"use client";

import { HouseEditModal } from "@/components/house-edit-modal";
import { GemSprite } from "@/components/gem-hunt/gem-sprite";
import { Button } from "@/components/ui/button";
import { gemClusterSessionSummaryHe } from "@/lib/gem-hunt-copy";
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
          className="flex flex-wrap items-end justify-center gap-3 py-2"
          dir="rtl"
          aria-label="שדונים שנמצאו במפגש"
        >
          {catches.map((item, index) => (
            <li
              key={item.house.id}
              className="gem-cluster-session-summary__slot flex flex-col items-center gap-1"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="gem-cluster-session-summary__sprite relative size-[4.5rem] sm:size-20">
                <GemSprite
                  house={item.house}
                  mode="3d"
                  size="fill"
                  motion="celebrate"
                  celebrateVariant={index + 1}
                  spinWhileCollect={false}
                />
              </div>
              {item.isNew ? (
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-100 ring-1 ring-amber-400/45">
                  חדש
                </span>
              ) : null}
            </li>
          ))}
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
