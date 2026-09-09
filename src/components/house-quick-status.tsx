"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { candyTone, CandySign, CANDY_TONES, type CandyTone } from "@/components/candy-glyphs";
import { Button } from "@/components/ui/button";
import { useAppNow } from "@/hooks/use-app-clock";
import { useAdminSession } from "@/hooks/use-admin-session";
import { freezeExpireIso, isOwnerFrozen } from "@/lib/house-state";
import { houseHoursWindows, nightStatusControlsEnabled } from "@/lib/hours";
import type { HouseInput, PublicHouse, SensitivityId, VisitState } from "@/lib/types";
import { SENSITIVITY_OPTIONS } from "@/lib/types";
import { cn } from "@/lib/utils";

export type QuickStatusPatch = Partial<HouseInput> & { ownerFrozenUntil?: string | null };

type NightStatus = "open" | "pause" | "stop";

type QuickDraft = {
  candy: CandyTone;
  nightStatus: NightStatus;
  outAndClosed: boolean;
};

function nightStatusFromHouse(house: PublicHouse): NightStatus {
  if (house.visit === "closed") return "stop";
  if (isOwnerFrozen(house)) return "pause";
  return "open";
}

function draftFromHouse(house: PublicHouse): QuickDraft {
  const candy = candyTone(house);
  const nightStatus = nightStatusFromHouse(house);
  return {
    candy,
    nightStatus,
    outAndClosed: nightStatus === "stop" && candy === "out",
  };
}

export function buildQuickPatch(
  house: PublicHouse,
  opts: { candy?: CandyTone; nightStatus?: NightStatus; outAndClosed?: boolean },
): QuickStatusPatch {
  const currentNight = nightStatusFromHouse(house);
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

function draftEqualsHouse(house: PublicHouse, draft: QuickDraft) {
  const saved = draftFromHouse(house);
  return (
    draft.candy === saved.candy &&
    draft.nightStatus === saved.nightStatus &&
    draft.outAndClosed === saved.outAndClosed
  );
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
  const [draft, setDraft] = useState<QuickDraft>(() => draftFromHouse(house));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(draftFromHouse(house));
  }, [house]);

  const nightStatusEnabled = nightStatusControlsEnabled(
    {
      openHours: houseHoursWindows(house),
      openFrom: house.openFrom,
      openTo: house.openTo,
    },
    now,
  );
  const blocked = Boolean(busy || saving);
  const dirty = useMemo(() => !draftEqualsHouse(house, draft), [house, draft]);
  const needsReopen = draft.nightStatus === "pause" || draft.nightStatus === "stop";

  async function saveDraft() {
    if (blocked || !dirty) return;
    setSaving(true);
    try {
      await onSave(
        buildQuickPatch(house, {
          candy: draft.candy,
          nightStatus: draft.nightStatus,
          outAndClosed: draft.outAndClosed,
        }),
      );
    } catch {
      toast.error("העדכון נכשל");
    } finally {
      setSaving(false);
    }
  }

  function reopen() {
    if (draft.outAndClosed) {
      setDraft({ candy: "out", nightStatus: "open", outAndClosed: false });
      return;
    }
    setDraft((current) => ({
      ...current,
      nightStatus: "open",
      outAndClosed: false,
    }));
  }

  return (
    <section
      className="sticky top-0 z-10 -mx-1 space-y-3 rounded-2xl bg-[#1d1028] p-3 ring-1 ring-orange-400/35"
      aria-label="עדכון מהיר בליל האלווין"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-base font-semibold text-orange-100">עדכון מהיר</p>
        {dirty ? <span className="text-base text-amber-300">יש שינויים שלא נשמרו</span> : null}
      </div>
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
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  candy: tone.id,
                  outAndClosed: tone.id === "out" ? current.outAndClosed : false,
                  nightStatus:
                    tone.id === "out" && current.outAndClosed
                      ? "stop"
                      : current.nightStatus === "stop" && tone.id !== "out"
                        ? "open"
                        : current.nightStatus,
                }))
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-medium",
                draft.candy === tone.id && !draft.outAndClosed
                  ? "bg-orange-500 text-black"
                  : draft.outAndClosed && tone.id === "out"
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
              setDraft((current) => ({
                ...current,
                nightStatus: "pause",
                outAndClosed: false,
              }))
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-medium",
              draft.nightStatus === "pause"
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
              setDraft((current) => ({
                ...current,
                nightStatus: "stop",
                outAndClosed: false,
              }))
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-medium",
              draft.nightStatus === "stop" && !draft.outAndClosed
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
              setDraft((current) => ({
                candy: "out",
                nightStatus: "stop",
                outAndClosed: true,
              }))
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-medium",
              draft.outAndClosed
                ? "bg-orange-500 text-black"
                : "bg-[#261536] text-orange-100 ring-1 ring-orange-500/30",
            )}
          >
            <CandySign tone="out" className="size-6" />
            <span className="night-status-dot is-closed" />
            נגמר — סגור
          </button>
        </div>
        {needsReopen && nightStatusEnabled ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={blocked}
            className="mt-2 border-emerald-400/50 text-emerald-200"
            onClick={reopen}
          >
            פתיחה מחדש
          </Button>
        ) : null}
      </div>
      <Button
        type="button"
        disabled={blocked || !dirty}
        className="h-10 w-full bg-orange-500 text-black hover:bg-orange-400"
        onClick={() => void saveDraft()}
      >
        {saving ? "שומרים…" : "שמירת עדכון מהיר"}
      </Button>
    </section>
  );
}
