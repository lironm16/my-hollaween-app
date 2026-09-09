"use client";

import { useState } from "react";
import { toast } from "sonner";
import { candyTone, CandySign, CANDY_TONES, type CandyTone } from "@/components/candy-glyphs";
import { useAppNow } from "@/hooks/use-app-clock";
import { useAdminSession } from "@/hooks/use-admin-session";
import { freezeExpireIso, isOwnerFrozen } from "@/lib/house-state";
import { houseHoursWindows, nightStatusControlsEnabled } from "@/lib/hours";
import type { HouseInput, PublicHouse, SensitivityId, VisitState } from "@/lib/types";
import { SENSITIVITY_OPTIONS } from "@/lib/types";
import { cn } from "@/lib/utils";

export type QuickStatusPatch = Partial<HouseInput> & { ownerFrozenUntil?: string | null };

function buildQuickPatch(
  house: PublicHouse,
  opts: { candy?: CandyTone; nightStatus?: "open" | "pause" | "stop"; outAndClosed?: boolean },
): QuickStatusPatch {
  const currentNight =
    house.visit === "closed"
      ? "stop"
      : isOwnerFrozen(house)
        ? "pause"
        : "open";
  const outAndClosed = opts.outAndClosed === true;
  const candy = outAndClosed ? "out" : (opts.candy ?? candyTone(house));
  const nightStatus = outAndClosed ? "stop" : (opts.nightStatus ?? currentNight);
  const withoutCandy = house.treats.filter((id) => id !== "candy");
  const treats =
    candy === "none"
      ? withoutCandy.filter((id) => !SENSITIVITY_OPTIONS.includes(id as SensitivityId))
      : (["candy" as const, ...withoutCandy] as HouseInput["treats"]);
  const treatStock = { ...(house.treatStock ?? {}) };
  if (candy === "none") {
    delete treatStock.candy;
    for (const id of SENSITIVITY_OPTIONS) delete treatStock[id];
  } else {
    treatStock.candy = candy;
    if (candy === "out") {
      for (const id of SENSITIVITY_OPTIONS) delete treatStock[id];
    }
  }
  const visit: VisitState =
    nightStatus === "stop"
      ? "closed"
      : candy === "plenty" || candy === "low" || candy === "out"
        ? "come"
        : house.decorLevel && house.decorLevel !== "none"
          ? "decorOnly"
          : "come";
  const ownerFrozenUntil =
    nightStatus === "pause" ? freezeExpireIso() : nightStatus === "open" ? null : null;
  return { treats, treatStock, visit, ownerFrozenUntil };
}

export function HouseQuickStatus({
  house,
  busy,
  onSave,
}: {
  house: PublicHouse;
  busy?: boolean;
  onSave: (patch: QuickStatusPatch) => Promise<unknown>;
}) {
  const now = useAppNow();
  const { admin } = useAdminSession();
  const [saving, setSaving] = useState(false);
  const candy = candyTone(house);
  const nightStatus: "open" | "pause" | "stop" =
    house.visit === "closed" ? "stop" : isOwnerFrozen(house) ? "pause" : "open";
  const outAndClosed = nightStatus === "stop" && candy === "out";
  const nightStatusEnabled = nightStatusControlsEnabled(
    {
      openHours: houseHoursWindows(house),
      openFrom: house.openFrom,
      openTo: house.openTo,
    },
    now,
  );
  const blocked = Boolean(busy || saving);

  async function apply(patch: QuickStatusPatch) {
    if (blocked) return;
    setSaving(true);
    try {
      await onSave(patch);
    } catch {
      toast.error("העדכון נכשל");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="sticky top-0 z-10 -mx-1 space-y-3 rounded-2xl bg-[#1d1028] p-3 ring-1 ring-orange-400/35"
      aria-label="עדכון מהיר בליל האלווין"
    >
      <p className="text-base font-semibold text-orange-100">עדכון מהיר</p>
      <div>
        <p className="mb-2 text-base font-medium text-violet-200">ממתקים</p>
        <p className="mb-2 text-base text-violet-400">
          «נגמר» = הממתקים אזלו, הבית עדיין פתוח. «נגמר — סגור» = אזלו הממתקים ולא מקבלים עוד
          ביקורים.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CANDY_TONES.map((tone) => (
            <button
              key={tone.id}
              type="button"
              disabled={blocked}
              onClick={() => void apply(buildQuickPatch(house, { candy: tone.id }))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-medium",
                candy === tone.id
                  ? "bg-orange-500 text-black"
                  : "bg-[#261536] text-orange-100 ring-1 ring-orange-500/30",
              )}
            >
              <CandySign tone={tone.id} className="size-6" />
              {tone.label}
            </button>
          ))}
        </div>
      </div>
      <div className={nightStatusEnabled ? undefined : "opacity-45"}>
        <p className="mb-2 text-base font-medium text-violet-200">הפסקה וסגירה</p>
        {nightStatusEnabled ? null : (
          <p className="mb-2 text-base text-violet-400">
            נפתח בליל האלווין, משעת הפעילות של הבית.
            {admin ? " לבדיקות: תפריט מנהל → בדיקות." : ""}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={blocked || !nightStatusEnabled}
            onClick={() =>
              void apply(
                buildQuickPatch(house, {
                  nightStatus: nightStatus === "pause" ? "open" : "pause",
                }),
              )
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-medium",
              nightStatus === "pause"
                ? "bg-orange-500 text-black"
                : "bg-[#261536] text-orange-100 ring-1 ring-orange-500/30",
            )}
          >
            <span className="night-status-dot is-break" />
            הפסקה
          </button>
          <button
            type="button"
            disabled={blocked || !nightStatusEnabled}
            onClick={() =>
              void apply(
                buildQuickPatch(house, {
                  nightStatus: nightStatus === "stop" ? "open" : "stop",
                }),
              )
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-medium",
              nightStatus === "stop" && !outAndClosed
                ? "bg-orange-500 text-black"
                : "bg-[#261536] text-orange-100 ring-1 ring-orange-500/30",
            )}
          >
            <span className="night-status-dot is-closed" />
            סגור
          </button>
          <button
            type="button"
            disabled={blocked || !nightStatusEnabled}
            onClick={() =>
              void apply(
                outAndClosed
                  ? buildQuickPatch(house, { nightStatus: "open", candy: "out" })
                  : buildQuickPatch(house, { outAndClosed: true }),
              )
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-medium",
              outAndClosed
                ? "bg-orange-500 text-black"
                : "bg-[#261536] text-orange-100 ring-1 ring-orange-500/30",
            )}
          >
            <CandySign tone="out" className="size-6" />
            <span className="night-status-dot is-closed" />
            נגמר — סגור
          </button>
        </div>
      </div>
    </section>
  );
}
