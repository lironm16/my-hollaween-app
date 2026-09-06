"use client";

import { useState, type ReactNode } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { compressJpegFile } from "@/lib/compress-image";
import { AddressField, reversePin } from "@/components/address-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { scareShort, decorShort, suggestedHouseName, nameMatchesTheme, themeFromName } from "@/lib/labels";
import { config, inNeighborhood } from "@/lib/config";
import type { AddressHit } from "@/lib/types";
import { streetPinHint } from "@/lib/address-text";
import {
  HOUSE_THEMES,
  SENSITIVITY_OPTIONS,
  type DecorLevel,
  type HouseInput,
  type ScareLevel,
  type SensitivityId,
  type TreatId,
  type VisitState,
} from "@/lib/types";
import { candyTone, CandySign, CANDY_TONES, type CandyTone } from "@/components/candy-glyphs";
import { freezeExpireIso, isOwnerFrozen, resolveDecorLevel } from "@/lib/house-state";
import { StrollerSign } from "@/components/symbols";
import { ScareSign } from "@/components/scare-glyphs";
import { SensitivityMark } from "@/components/sensitivity-glyphs";
import { houseHoursWindows, MAX_HOUR_WINDOWS, nightStatusControlsEnabled, syncHoursFields } from "@/lib/hours";
import type { HoursWindow } from "@/lib/types";

const empty: HouseInput = {
  name: "",
  theme: "pumpkin",
  address: "",
  arrival: "",
  description: "",
  lat: config.map.center.lat,
  lng: config.map.center.lng,
  treats: ["candy"],
  scareLevel: "mild",
  openFrom: "17:00",
  openTo: "21:00",
  openHours: [{ from: "17:00", to: "21:00" }],
  openFrom2: "",
  openTo2: "",
  notes: "",
  accessible: false,
  visit: "come",
  treatStock: { candy: "plenty" },
  decorLevel: "mild",
  decorated: true,
};

function clock(value: string) {
  return /^\d{2}:\d{2}/.exec(value)?.[0] ?? value;
}

function initialCandyTone(initial?: Partial<HouseInput>): CandyTone {
  if (!initial) return "plenty";
  return candyTone({ treats: initial.treats ?? ["candy"], treatStock: initial.treatStock });
}

function initialDecorLevel(initial?: Partial<HouseInput>): DecorLevel {
  if (!initial) return "mild";
  return resolveDecorLevel(initial);
}

export type HouseFormExtras = {
  photoDataUrl?: string;
  clearPhoto?: boolean;
  ownerFrozenUntil?: string | null;
};

export function HouseForm({
  initial,
  submitLabel,
  onSubmit,
  busy,
  extraActions,
}: {
  initial?: Partial<HouseInput> & { photoUrl?: string; visit?: VisitState; ownerFrozenUntil?: string | null };
  submitLabel: string;
  onSubmit: (input: HouseInput, extras?: HouseFormExtras) => Promise<void> | void;
  busy?: boolean;
  extraActions?: ReactNode;
}) {
  const [form, setForm] = useState<HouseInput>({ ...empty, ...initial });
  const [locating, setLocating] = useState(false);
  const [addressOk, setAddressOk] = useState(Boolean(initial?.address && initial.lat && initial.lng));
  const [decorLevel, setDecorLevel] = useState<DecorLevel>(() => initialDecorLevel(initial));
  const [candy, setCandy] = useState<CandyTone>(() => initialCandyTone(initial));
  const [hourWindows, setHourWindows] = useState<HoursWindow[]>(() => {
    const windows = houseHoursWindows({ ...empty, ...initial });
    return windows.length ? windows : [{ from: "17:00", to: "21:00" }];
  });
  const [nightStatus, setNightStatus] = useState<"open" | "pause" | "stop">(() => {
    if (initial?.visit === "closed") return "stop";
    if (isOwnerFrozen(initial ?? {})) return "pause";
    return "open";
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [clearPhoto, setClearPhoto] = useState(false);
  const existingPhoto = initial?.photoUrl ?? "";

  function updateHourWindow(index: number, patch: Partial<HoursWindow>) {
    setHourWindows((current) =>
      current.map((window, i) => (i === index ? { ...window, ...patch } : window)),
    );
  }

  function addHourWindow() {
    setHourWindows((current) => {
      if (current.length >= MAX_HOUR_WINDOWS) return current;
      const last = current[current.length - 1];
      const nextFrom = last?.to || "20:00";
      return [...current, { from: nextFrom, to: "21:00" }];
    });
  }

  function removeHourWindow(index: number) {
    setHourWindows((current) =>
      current.length <= 1 ? current : current.filter((_, i) => i !== index),
    );
  }

  function pickCandy(tone: CandyTone) {
    setCandy(tone);
    if (tone !== "plenty" && tone !== "low") {
      setForm((f) => {
        const treats = f.treats.filter((id) => !SENSITIVITY_OPTIONS.includes(id as SensitivityId));
        const treatStock = { ...(f.treatStock ?? {}) };
        for (const id of SENSITIVITY_OPTIONS) delete treatStock[id];
        return { ...f, treats, treatStock };
      });
    }
  }

  const candyOffered = candy === "plenty" || candy === "low";
  const undecorated = decorLevel === "none";
  const nightStatusEnabled = nightStatusControlsEnabled({
    openHours: hourWindows,
    openFrom: hourWindows[0]?.from,
    openTo: hourWindows[0]?.to,
  });

  function pickScare(level: ScareLevel) {
    setForm((f) => ({ ...f, scareLevel: level }));
    setDecorLevel((current) => (current === "none" ? "mild" : current));
  }

  function setTreat(id: TreatId, on: boolean) {
    setForm((f) => {
      const rest = f.treats.filter((t) => t !== id);
      const treats = on ? [...rest, id] : rest;
      const treatStock = { ...(f.treatStock ?? {}) };
      if (on) treatStock[id] = treatStock[id] ?? "plenty";
      else delete treatStock[id];
      return { ...f, treats, treatStock };
    });
  }

  function applyNameSuggestion(theme: (typeof HOUSE_THEMES)[number]) {
    setForm((f) => ({ ...f, theme, name: suggestedHouseName(theme) }));
  }

  function onAddressTyped(value: string) {
    setAddressOk(false);
    setForm((f) => ({ ...f, address: value }));
  }

  function onAddressSelect(hit: AddressHit) {
    if (!inNeighborhood(hit.lat, hit.lng)) {
      toast.error("הכתובת מחוץ לשכונה. בחרו בית בשיכון ותיקים, חרוזים או נחלת גנים.");
      setAddressOk(false);
      setForm((f) => ({ ...f, address: hit.label }));
      return;
    }
    setForm((f) => ({ ...f, address: hit.label, lat: hit.lat, lng: hit.lng }));
    setAddressOk(true);
    if (!hit.precise) {
      toast.message(streetPinHint(hit) ?? "סימנו את הרחוב. גררו את הסיכה עד לבית שלכם.");
    }
  }

  async function syncFromPin(lat: number, lng: number) {
    if (!inNeighborhood(lat, lng)) {
      toast.error("הסיכה מחוץ לגבולות השכונה.");
      setForm((f) => ({ ...f, lat, lng }));
      setAddressOk(false);
      return;
    }
    setForm((f) => ({ ...f, lat, lng }));
    const hit = await reversePin(lat, lng);
    if (!hit) {
      setAddressOk(false);
      toast.error("לא מצאנו כתובת בנקודה הזו. הזינו רחוב ומספר מהרשימה.");
      return;
    }
    if (!inNeighborhood(hit.lat, hit.lng)) {
      setAddressOk(false);
      return;
    }
    setForm((f) => ({ ...f, lat, lng, address: hit.label }));
    setAddressOk(true);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void syncFromPin(pos.coords.latitude, pos.coords.longitude).finally(() =>
          setLocating(false),
        );
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!addressOk) {
          toast.error("בחרו כתובת אמיתית מהרשימה, או גררו את הסיכה לבית.");
          return;
        }
        if (decorLevel === "none" && candy !== "plenty" && candy !== "low" && !(nightStatusEnabled && nightStatus === "stop") && initial?.visit !== "closed") {
          toast.error("סמנו לפחות קישוטים או ממתקים — אחרת אין סיבה להוסיף את הבית למפה.");
          return;
        }
        const theme = themeFromName(form.name) ?? form.theme;
        const withoutCandy = form.treats.filter((id) => id !== "candy");
        const treats =
          candy === "none"
            ? withoutCandy.filter((id) => !SENSITIVITY_OPTIONS.includes(id as SensitivityId))
            : (["candy" as const, ...withoutCandy] as TreatId[]);
        const treatStock = { ...(form.treatStock ?? {}) };
        if (candy === "none") {
          delete treatStock.candy;
          for (const id of SENSITIVITY_OPTIONS) delete treatStock[id];
        } else {
          treatStock.candy = candy;
          if (candy === "out") {
            for (const id of SENSITIVITY_OPTIONS) delete treatStock[id];
          }
        }
        const effectiveNight = nightStatusEnabled
          ? nightStatus
          : initial?.visit === "closed"
            ? "stop"
            : isOwnerFrozen(initial ?? {})
              ? "pause"
              : "open";
        const visit: VisitState =
          effectiveNight === "stop"
            ? "closed"
            : candy === "plenty" || candy === "low" || candy === "out"
              ? "come"
              : decorLevel !== "none"
                ? "decorOnly"
                : "come";
        const ownerFrozenUntil =
          effectiveNight === "pause"
            ? nightStatusEnabled
              ? freezeExpireIso()
              : (initial?.ownerFrozenUntil ?? freezeExpireIso())
            : null;
        const windows = hourWindows.map((window) => ({
          from: clock(window.from),
          to: clock(window.to),
        }));
        if (
          windows.length === 0 ||
          windows.some((window) => !/^\d{2}:\d{2}$/.test(window.from) || !/^\d{2}:\d{2}$/.test(window.to))
        ) {
          toast.error("מלאו את כל חלונות השעות, או הסירו חלון ריק.");
          return;
        }
        const hours = syncHoursFields(windows);
        const payload: HouseInput = {
          ...form,
          theme,
          treats,
          treatStock,
          visit,
          decorLevel,
          decorated: decorLevel !== "none",
          openHours: hours.openHours,
          openFrom: hours.openFrom,
          openTo: hours.openTo,
          openFrom2: hours.openFrom2,
          openTo2: hours.openTo2,
        };
        void (async () => {
          let photoDataUrl: string | undefined;
          if (photoFile) {
            try {
              photoDataUrl = await compressJpegFile(photoFile);
            } catch {
              toast.error("לא הצלחנו לעבד את התמונה");
              return;
            }
          }
          await onSubmit(payload, {
            photoDataUrl,
            clearPhoto: clearPhoto && !photoFile,
            ownerFrozenUntil,
          });
        })();
      }}
    >
      <FormSection title="הבית">
        <div>
          <p className="mb-2 text-base font-medium">שם הבית</p>
          <Input
            required
            value={form.name}
            minLength={2}
            onChange={(e) => {
              const name = e.target.value;
              const theme = themeFromName(name) ?? form.theme;
              setForm({ ...form, name, theme });
            }}
            placeholder="בית משפחת לוי, או בחרו הצעה"
            className="h-10 bg-[#1d1028]"
          />
          <p className="mt-2 text-base text-violet-300">הצעות לשם — לחיצה ממלאת את השדה</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {HOUSE_THEMES.map((theme) => {
              const selected = nameMatchesTheme(form.name, theme);
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => applyNameSuggestion(theme)}
                  className={
                    selected
                      ? "rounded-full bg-orange-500 px-3 py-1.5 text-base font-medium text-black"
                      : "rounded-full bg-[#1d1028] px-3 py-1.5 text-base text-orange-100 ring-1 ring-orange-500/30"
                  }
                >
                  {suggestedHouseName(theme)}
                </button>
              );
            })}
          </div>
        </div>
      </FormSection>
      <FormSection title="איפה למצוא">
        <Field label="כתובת">
          <AddressField
            value={form.address}
            onChange={onAddressTyped}
            onSelect={onAddressSelect}
            confirmed={addressOk}
            disabled={busy}
          />
        </Field>
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-base font-medium">סיכה על המפה</p>
            <Button type="button" size="sm" variant="outline" onClick={useMyLocation}>
              {locating ? "מאתרים…" : "המיקום שלי"}
            </Button>
          </div>
          <p className="mb-2 text-base text-violet-300">
            אחרי בחירת כתובת הסיכה זזה לשם. אפשר לגרור אותה לכניסה המדויקת.
          </p>
          <div className="relative z-0 isolate h-72 overflow-hidden rounded-xl ring-1 ring-orange-500/30">
            <HouseMapDynamic
              pickMode
              pick={{ lat: form.lat, lng: form.lng }}
              onPick={(lat, lng) => void syncFromPin(lat, lng)}
            />
          </div>
          <p className="mt-1 text-base text-violet-300">
            מיקום: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
          </p>
        </div>
        <Field label="איך מגיעים — קומה, דירה, הוראות">
          <Input
            value={form.arrival}
            onChange={(e) => setForm({ ...form, arrival: e.target.value })}
            placeholder="קומה 2, דירה 5, ימינה אחרי השער"
          />
        </Field>
      </FormSection>
      <FormSection title="מתי פתוחים">
        <div className="space-y-3">
          <p className="text-base font-medium">שעות ב־31 באוקטובר</p>
          <p className="text-base text-violet-300">
            הבתים פתוחים רק בליל האלווין. אפשר כמה חלונות בערב (למשל 17:00–18:00, 19:00–20:00) אם
            יוצאים באמצע לטריק-אור-טריט.
          </p>
          {hourWindows.map((window, index) => (
            <div
              key={`hours-${index}`}
              className="space-y-2 rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-medium text-orange-100">
                  {hourWindows.length === 1 ? "חלון שעות" : `חלון ${index + 1}`}
                </p>
                {hourWindows.length > 1 ? (
                  <button
                    type="button"
                    className="text-base text-violet-300 underline-offset-2 hover:underline"
                    onClick={() => removeHourWindow(index)}
                  >
                    הסרה
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Field label="פתיחה">
                  <TimeField
                    required
                    value={window.from}
                    onChange={(from) => updateHourWindow(index, { from })}
                  />
                </Field>
                <Field label="סגירה">
                  <TimeField
                    required
                    value={window.to}
                    onChange={(to) => updateHourWindow(index, { to })}
                  />
                </Field>
              </div>
            </div>
          ))}
          {hourWindows.length < MAX_HOUR_WINDOWS ? (
            <button
              type="button"
              className="text-base font-medium text-orange-300 underline-offset-2 hover:underline"
              onClick={addHourWindow}
            >
              + הוספת חלון שעות
            </button>
          ) : null}
        </div>
      </FormSection>
      <FormSection title="מה יפגשו בבית">
        <div>
          <p className="mb-2 text-base font-medium">רמת פחד</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setDecorLevel("none")}
              className={
                undecorated
                  ? "inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-base font-medium text-black"
                  : "inline-flex items-center gap-1.5 rounded-full bg-[#1d1028] px-3 py-1.5 text-base text-orange-100 ring-1 ring-orange-500/30"
              }
            >
              <ScareSign level="none" className="size-6" />
              {decorShort.none}
            </button>
            {(["mild", "medium", "spicy"] as ScareLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => pickScare(level)}
                className={
                  !undecorated && form.scareLevel === level
                    ? "inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-base font-medium text-black"
                    : "inline-flex items-center gap-1.5 rounded-full bg-[#1d1028] px-3 py-1.5 text-base text-orange-100 ring-1 ring-orange-500/30"
                }
              >
                <ScareSign level={level} className="size-6" />
                {scareShort[level]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-base font-medium">ממתקים</p>
          <div className="flex flex-wrap gap-1.5">
            {CANDY_TONES.map((tone) => (
              <button
                key={tone.id}
                type="button"
                onClick={() => pickCandy(tone.id)}
                className={
                  candy === tone.id
                    ? "inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-base font-medium text-black"
                    : "inline-flex items-center gap-1.5 rounded-full bg-[#1d1028] px-3 py-1.5 text-base text-orange-100 ring-1 ring-orange-500/30"
                }
              >
                <CandySign tone={tone.id} className="size-6" />
                {tone.label}
              </button>
            ))}
          </div>
        </div>
        <div className={nightStatusEnabled ? undefined : "opacity-45"}>
          <p className="mb-2 text-base font-medium">הפסקה וסגירה</p>
          {nightStatusEnabled ? null : (
            <p className="mb-2 text-base text-violet-300">
              נפתח בליל האלווין, משעת הפעילות של הבית. אז אפשר לסמן הפסקה זמנית או סגירה לערב.
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={!nightStatusEnabled}
              onClick={() => setNightStatus((current) => (current === "pause" ? "open" : "pause"))}
              className={
                nightStatus === "pause"
                  ? "inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-base font-medium text-black"
                  : "inline-flex items-center gap-1.5 rounded-full bg-[#1d1028] px-3 py-1.5 text-base text-orange-100 ring-1 ring-orange-500/30"
              }
            >
              <span className="night-status-dot is-break" />
              הפסקה
            </button>
            <button
              type="button"
              disabled={!nightStatusEnabled}
              onClick={() => setNightStatus((current) => (current === "stop" ? "open" : "stop"))}
              className={
                nightStatus === "stop"
                  ? "inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-base font-medium text-black"
                  : "inline-flex items-center gap-1.5 rounded-full bg-[#1d1028] px-3 py-1.5 text-base text-orange-100 ring-1 ring-orange-500/30"
              }
            >
              <span className="night-status-dot is-closed" />
              סגור
            </button>
          </div>
        </div>
        <div
          className={
            candyOffered
              ? "space-y-2 rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20"
              : "space-y-2 rounded-xl bg-[#1d1028] p-3 opacity-45 ring-1 ring-orange-500/15"
          }
        >
          <p className="text-base font-medium text-orange-100">רגישויות והתאמות</p>
          <p className="text-base text-violet-300">
            {candyOffered
              ? "סמנו מה יש בבית לילדים עם רגישויות"
              : "בחרו יש או מעט ממתקים כדי לסמן רגישויות"}
          </p>
          <div className="space-y-2">
            {SENSITIVITY_OPTIONS.map((id) => (
              <label key={id} className="flex items-center gap-2 text-base text-orange-50">
                <input
                  type="checkbox"
                  className="size-4 accent-orange-500"
                  disabled={!candyOffered}
                  checked={candyOffered && form.treats.includes(id)}
                  onChange={(e) => setTreat(id, e.target.checked)}
                />
                <SensitivityMark labeled kind={id} />
              </label>
            ))}
          </div>
        </div>
        <Field label="מה מחכה בבית?">
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="קישוטים, אווירה, הפתעות…"
            className="min-h-24"
          />
        </Field>
      </FormSection>
      <FormSection title="הכניסה">
        <label className="flex items-start gap-2 rounded-xl bg-[#1d1028] p-3 text-base ring-1 ring-orange-500/20">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-orange-500"
            checked={form.accessible}
            onChange={(e) => setForm({ ...form, accessible: e.target.checked })}
          />
          <span>
            <span className="inline-flex items-center gap-2 font-medium text-orange-100">
              <StrollerSign />
              נגיש
            </span>
            <span className="block text-base text-violet-300">
              בלי מדרגות בכניסה, מתאים לעגלה או לכיסא גלגלים
            </span>
          </span>
        </label>
        <Field label="הערות (כלב, מדרגות, עגלה…)">
          <Input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
      </FormSection>
      <FormSection title="תמונת קישוט">
        <p className="text-base text-violet-300">אפשר גם להעלות אחרי שתקשטו את הבית.</p>
        {photoPreview || (existingPhoto && !clearPhoto) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoPreview || existingPhoto}
            alt=""
            className="mb-2 h-36 w-full rounded-xl object-cover ring-1 ring-orange-500/25"
          />
        ) : (
          <div className="mb-2 flex h-24 items-center justify-center rounded-xl bg-[#1d1028] text-base text-violet-400 ring-1 ring-orange-500/15">
            אין תמונה עדיין
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer">
            <span
              className={
                busy
                  ? "inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-base font-medium text-white opacity-60"
                  : "inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-base font-medium text-white"
              }
            >
              <Camera className="size-3.5" />
              {photoPreview || (existingPhoto && !clearPhoto) ? "החלפת תמונה" : "העלאת תמונה"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setPhotoFile(file);
                setClearPhoto(false);
                const reader = new FileReader();
                reader.onload = () => setPhotoPreview(String(reader.result ?? ""));
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {photoPreview || (existingPhoto && !clearPhoto) ? (
            <button
              type="button"
              disabled={busy}
              className="rounded-lg px-3 py-2 text-base text-violet-200 ring-1 ring-orange-500/30"
              onClick={() => {
                setPhotoFile(null);
                setPhotoPreview(null);
                setClearPhoto(true);
              }}
            >
              הסרת תמונה
            </button>
          ) : null}
        </div>
      </FormSection>
      <Button
        type="submit"
        disabled={busy}
        className="h-10 w-full bg-orange-500 text-black hover:bg-orange-400"
      >
        {busy ? "שולחים…" : submitLabel}
      </Button>
      {extraActions}
    </form>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="border-b border-orange-500/25 pb-1 text-base font-semibold text-orange-200">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/** Native time inputs ignore RTL text-align; overlay pins the value to the end. */
function TimeField({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="house-time-wrap relative w-full">
      <Input
        type="time"
        required={required}
        dir="ltr"
        lang="he-IL"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="house-time-input h-11 w-full min-w-0 bg-[#1d1028] text-base"
      />
      <span className="house-time-value" aria-hidden="true">
        {value || "--:--"}
      </span>
    </div>
  );
}
