"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { treatLabels, visitLabels, stockLabels } from "@/lib/labels";
import {
  freezeLabel,
  isFrozen,
  ownerFreezeUntil,
  tonightAt,
  treatLevel,
} from "@/lib/house-state";
import {
  STOCK_LEVELS,
  TREAT_OPTIONS,
  VISIT_STATES,
  type NightPatch,
  type PublicHouse,
  type StockLevel,
  type TreatId,
  type VisitState,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  house: PublicHouse;
  onUpdated: (house: PublicHouse) => void;
  editCode?: string;
  admin?: boolean;
};

export function NightDesk({ house, onUpdated, editCode, admin }: Props) {
  const [busy, setBusy] = useState(false);
  const frozen = isFrozen(house);
  const freezeText = freezeLabel(house);

  async function save(patch: NightPatch) {
    setBusy(true);
    try {
      const url = admin
        ? `/api/admin/houses/${encodeURIComponent(house.id)}`
        : `/api/houses/${encodeURIComponent(house.id)}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(admin ? patch : { ...patch, editCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "העדכון נכשל");
        return;
      }
      onUpdated(data.house as PublicHouse);
      toast.success("עודכן");
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file || !editCode) return;
    setBusy(true);
    try {
      const image = await compressJpeg(file);
      const res = await fetch(`/api/houses/${encodeURIComponent(house.id)}/photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editCode, image }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "העלאת התמונה נכשלה");
        return;
      }
      onUpdated(data.house as PublicHouse);
      toast.success("התמונה נשמרה");
    } catch {
      toast.error("לא הצלחנו לדחוס או לשמור את התמונה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl bg-[#1d1028] p-3 ring-1 ring-orange-400/30">
      <p className="font-medium text-orange-200">מצב עכשיו — מלאי והקפאה</p>
      {house.adminFrozen && !admin ? (
        <p className="rounded-lg bg-violet-950/70 px-3 py-2 text-sm text-violet-100">
          מנהל הסתיר את הבית מהמפה הציבורית. אי אפשר לבטל את זה מקוד העריכה.
        </p>
      ) : null}
      {freezeText ? (
        <p className="rounded-lg bg-[#2a1638] px-3 py-2 text-sm text-amber-100">{freezeText}</p>
      ) : null}

      <p className="text-xs text-violet-300">האם כדאי לבוא?</p>
      <div className="flex flex-wrap gap-1.5">
        {VISIT_STATES.map((state) => (
          <button
            key={state}
            type="button"
            disabled={busy}
            onClick={() => void save({ visit: state as VisitState })}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs",
              (house.visit ?? (house.soldOut ? "closed" : "come")) === state
                ? state === "closed"
                  ? "bg-red-700 text-white"
                  : "bg-orange-500 text-black"
                : "bg-black/30 text-orange-100 ring-1 ring-orange-500/30",
            )}
          >
            {visitLabels[state]}
          </button>
        ))}
      </div>

      <p className="text-xs text-violet-300">מלאי לפי סוג</p>
      <ul className="space-y-1.5">
        {TREAT_OPTIONS.filter((id) => house.treats.includes(id)).map((id) => (
          <li key={id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-orange-100">{treatLabels[id]}</span>
            <span className="flex gap-1">
              {STOCK_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void save({
                      treatStock: { ...house.treatStock, [id]: level as StockLevel },
                    })
                  }
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px]",
                    treatLevel(house, id as TreatId) === level
                      ? level === "out"
                        ? "bg-red-700 text-white"
                        : level === "low"
                          ? "bg-amber-400 text-black"
                          : "bg-emerald-700 text-white"
                      : "bg-black/30 text-violet-100 ring-1 ring-violet-500/25",
                  )}
                >
                  {stockLabels[level]}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-violet-300">הקפאה מהמפה הציבורית</p>
      <p className="text-[11px] text-violet-400">
        בהקפאה הילדים לא רואים את הבית. אצל המנהלים הוא נשאר כסיכה שקופה. מתאים אם יוצאים בעצמכם לטריק-אור-טריט.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {admin ? (
          <Button
            size="sm"
            variant={house.adminFrozen ? "outline" : "destructive"}
            disabled={busy}
            onClick={() => void save({ adminFrozen: !house.adminFrozen })}
          >
            {house.adminFrozen ? "החזרה למפה הציבורית" : "הקפאת מנהל"}
          </Button>
        ) : null}
        {!house.adminFrozen || admin ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void save({ ownerFrozenUntil: ownerFreezeUntil(30 * 60 * 1000) })}
            >
              30 דק׳
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void save({ ownerFrozenUntil: ownerFreezeUntil(60 * 60 * 1000) })}
            >
              שעה
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void save({ ownerFrozenUntil: tonightAt(22) })}
            >
              עד 22:00
            </Button>
            {frozen ? (
              <Button
                size="sm"
                disabled={busy}
                onClick={() => void save({ ownerFrozenUntil: null, ...(admin ? { adminFrozen: false } : {}) })}
              >
                בטל הקפאה
              </Button>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="space-y-1.5 border-t border-orange-500/15 pt-3">
        <p className="text-xs text-violet-300">תמונת קישוט (לא חובה)</p>
        <p className="text-[11px] text-violet-400">
          תמונה אחת, דחוסה לכ־100KB, נטענת רק כשפותחים את כרטיס הבית — לא על המפה. ככה 1,000 ילדים בלילה לא שורפים את החבילה החינמית.
        </p>
        {house.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={house.photoUrl}
            alt=""
            className="h-28 w-full rounded-xl object-cover ring-1 ring-orange-500/25"
          />
        ) : null}
        {editCode ? (
          <label className="inline-flex cursor-pointer">
            <span className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-black">
              {house.photoUrl ? "החלפת תמונה" : "העלאת תמונה"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={(e) => void onPhoto(e.target.files?.[0])}
            />
          </label>
        ) : (
          <p className="text-[11px] text-violet-400">העלאה דרך קוד העריכה של בעל הבית.</p>
        )}
      </div>
    </div>
  );
}

async function compressJpeg(file: File) {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const max = 960;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  let quality = 0.72;
  let data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > 140_000 && quality > 0.38) {
    quality -= 0.08;
    data = canvas.toDataURL("image/jpeg", quality);
  }
  return data;
}
