"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { compressJpegFile, type PhotoFocus } from "@/lib/compress-image";
import { HOUSE_CARD_PHOTO_BOX, HousePhotoFrame } from "@/components/house-photo-frame";
import { AddressField, reversePin } from "@/components/address-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import {
  scareShort,
  decorShort,
  suggestedHouseName,
  nameMatchesTheme,
  themeFromName,
  houseKindLabels,
  poiCategoryLabels,
} from "@/lib/labels";
import { isPoiHouse } from "@/lib/house-kind";
import { displayAddressFromHit, neighborhoodFromAddressHit } from "@/lib/address-fields";
import { config, inNeighborhood, NEIGHBORHOODS } from "@/lib/config";
import type { AddressHit } from "@/lib/types";
import { streetPinHint } from "@/lib/address-text";
import {
  HOUSE_THEMES,
  POI_CATEGORIES,
  SENSITIVITY_OPTIONS,
  type DecorLevel,
  type HouseInput,
  type HouseKind,
  type PoiCategory,
  type ScareLevel,
  type SensitivityId,
  type TreatId,
  type VisitState,
} from "@/lib/types";
import { candyTone, CandySign, CANDY_TONES, type CandyTone } from "@/components/candy-glyphs";
import { freezeExpireIso, isOwnerFrozen, resolveDecorLevel } from "@/lib/house-state";
import { StrollerSign } from "@/components/symbols";
import { ScarePumpkin, ScareSign } from "@/components/scare-glyphs";
import { SensitivityMark } from "@/components/sensitivity-glyphs";
import {
  houseHoursWindows,
  hoursWindowsIssue,
  MAX_HOUR_WINDOWS,
  nightStatusControlsEnabled,
  parseClockMinutes,
  syncHoursFields,
} from "@/lib/hours";
import { useAppNow } from "@/hooks/use-app-clock";
import { useAdminSession } from "@/hooks/use-admin-session";
import type { HoursWindow } from "@/lib/types";
import { HOUSE_FIELD_LIMITS } from "@/lib/schema";
import { cn } from "@/lib/utils";

const empty: HouseInput = {
  kind: "house",
  poiCategory: "coffee",
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
  openTo: "20:00",
  openHours: [{ from: "17:00", to: "20:00" }],
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
  addedBy?: string | null;
};

export function HouseForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  busy,
  extraActions,
}: {
  initial?: Partial<HouseInput> & {
    id?: string;
    photoUrl?: string;
    visit?: VisitState;
    ownerFrozenUntil?: string | null;
    addedBy?: string | null;
  };
  submitLabel: string;
  onSubmit: (input: HouseInput, extras?: HouseFormExtras) => Promise<void> | void;
  onCancel?: () => void;
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
    return windows.length ? windows : [{ from: "17:00", to: "20:00" }];
  });
  const [nightStatus, setNightStatus] = useState<"open" | "pause" | "stop">(() => {
    if (initial?.visit === "closed") return "stop";
    if (isOwnerFrozen(initial ?? {})) return "pause";
    return "open";
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFocus, setPhotoFocus] = useState<PhotoFocus>({ x: 50, y: 50 });
  const [clearPhoto, setClearPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addedBy, setAddedBy] = useState(() => initial?.addedBy?.trim() ?? "");
  const existingPhoto = initial?.photoUrl ?? "";
  const isNewHouse = !initial?.id;
  const now = useAppNow();
  const { admin } = useAdminSession();
  const blocked = Boolean(busy || saving);
  const isPoi = isPoiHouse(form);
  const scareGlyph = isPoi ? ScarePumpkin : undefined;

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
      const fromMin = parseClockMinutes(clock(nextFrom));
      const toMin = fromMin === null ? 21 * 60 : Math.min(23 * 60 + 59, fromMin + 60);
      if (fromMin !== null && toMin <= fromMin) return current;
      const hours = Math.floor(toMin / 60);
      const minutes = toMin % 60;
      const nextTo = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      return [...current, { from: nextFrom, to: nextTo }];
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
        return { ...f, treats };
      });
    }
  }

  const candyOffered = candy === "plenty" || candy === "low";
  const undecorated = decorLevel === "none";
  const hoursIssue = hoursWindowsIssue(
    hourWindows.map((window) => ({ from: clock(window.from), to: clock(window.to) })),
  );
  const hoursSource = {
    openHours: hourWindows,
    openFrom: hourWindows[0]?.from,
    openTo: hourWindows[0]?.to,
  };
  const pauseCloseEnabled = nightStatusControlsEnabled(hoursSource, now);

  useEffect(() => {
    if (!pauseCloseEnabled && nightStatus !== "open") setNightStatus("open");
  }, [pauseCloseEnabled, nightStatus]);

  useEffect(() => {
    setAddedBy(initial?.addedBy?.trim() ?? "");
  }, [initial?.id, initial?.addedBy]);

  function pickScare(level: ScareLevel) {
    setForm((f) => ({ ...f, scareLevel: level }));
    setDecorLevel((current) => (current === "none" ? "mild" : current));
  }

  function setTreat(id: SensitivityId, on: boolean) {
    setForm((f) => {
      const rest = f.treats.filter((t) => t !== id);
      const treats = on ? [...rest, id] : rest;
      return { ...f, treats };
    });
  }

  function applyNameSuggestion(theme: (typeof HOUSE_THEMES)[number]) {
    setForm((f) => ({ ...f, theme, name: suggestedHouseName(theme) }));
  }

  function onAddressTyped(value: string) {
    setAddressOk(false);
    setForm((f) => ({ ...f, address: value, neighborhood: undefined }));
  }

  function onAddressSelect(hit: AddressHit) {
    if (!inNeighborhood(hit.lat, hit.lng)) {
      toast.error(
        `הכתובת מחוץ לשכונה. בחרו בית ב${NEIGHBORHOODS.slice(0, -1).join(", ")} או ${NEIGHBORHOODS[NEIGHBORHOODS.length - 1]}.`,
      );
      setAddressOk(false);
      setForm((f) => ({ ...f, address: hit.label }));
      return;
    }
    setForm((f) => ({
      ...f,
      address: displayAddressFromHit(hit),
      neighborhood: neighborhoodFromAddressHit(hit),
      lat: hit.lat,
      lng: hit.lng,
    }));
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
    setForm((f) => ({
      ...f,
      lat,
      lng,
      address: displayAddressFromHit(hit),
      neighborhood: neighborhoodFromAddressHit(hit),
    }));
    setAddressOk(true);
    if (!hit.precise) {
      toast.message(streetPinHint(hit) ?? "סימנו את הרחוב. גררו את הסיכה עד לבית שלכם.");
    }
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
        if (blocked) return;
        if (!addressOk) {
          toast.error("בחרו כתובת אמיתית מהרשימה, או גררו את הסיכה לבית.");
          return;
        }
        const submitter = addedBy.trim();
        if (isNewHouse && submitter.length < 2) {
          toast.error("נא למלא מי מוסיף את הבית.");
          return;
        }
        if (!isNewHouse && submitter.length > 0 && submitter.length < 2) {
          toast.error("שם מלא של מי שהוסיף את הבית — לפחות 2 תווים.");
          return;
        }
        if (decorLevel === "none" && candy !== "plenty" && candy !== "low" && !(pauseCloseEnabled && nightStatus === "stop") && initial?.visit !== "closed") {
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
        } else {
          treatStock.candy = candy;
        }
        const effectiveNight =
          pauseCloseEnabled && nightStatus !== "open" ? nightStatus : "open";
        const visit: VisitState =
          effectiveNight === "stop"
            ? "closed"
            : candy === "plenty" || candy === "low" || candy === "out"
              ? "come"
              : decorLevel !== "none"
                ? "decorOnly"
                : "come";
        const ownerFrozenUntil = effectiveNight === "pause" ? freezeExpireIso() : null;
        const windows = hourWindows.map((window) => ({
          from: clock(window.from),
          to: clock(window.to),
        }));
        const hoursIssue = hoursWindowsIssue(windows);
        if (hoursIssue) {
          toast.error(hoursIssue);
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
          ...(admin
            ? {
                kind: form.kind ?? "house",
                poiCategory: form.kind === "poi" ? (form.poiCategory ?? "other") : null,
              }
            : { kind: "house", poiCategory: null }),
        };
        setSaving(true);
        void (async () => {
          try {
            let photoDataUrl: string | undefined;
            if (photoFile) {
              try {
                photoDataUrl = await compressJpegFile(photoFile, photoFocus);
              } catch {
                toast.warning("לא הצלחנו לעבד את התמונה — שומרים את הבית בלי תמונה.");
              }
            }
            await onSubmit(payload, {
              photoDataUrl,
              clearPhoto: clearPhoto && !photoFile,
              ownerFrozenUntil,
              addedBy: submitter || null,
            });
          } finally {
            setSaving(false);
          }
        })();
      }}
    >
      {admin ? (
        <FormSection title="סוג מקום (מנהל)">
          <div className="flex flex-wrap gap-1.5">
            {(["house", "poi"] as HouseKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    kind,
                    poiCategory: kind === "poi" ? current.poiCategory ?? "coffee" : null,
                  }))
                }
                className={
                  (form.kind ?? "house") === kind
                    ? "inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-lg font-medium text-black"
                    : "inline-flex items-center gap-1.5 rounded-full bg-[#1d1028] px-3 py-1.5 text-lg text-orange-100 ring-1 ring-orange-500/30"
                }
              >
                {kind === "poi" ? (
                  <ScareSign Glyph={ScarePumpkin} level="mild" className="size-6" />
                ) : (
                  <ScareSign level="mild" className="size-6" />
                )}
                {houseKindLabels[kind]}
              </button>
            ))}
          </div>
          {isPoi ? (
            <div className="mt-3">
              <p className="mb-2 text-lg font-medium">קטגוריה</p>
              <div className="flex flex-wrap gap-1.5">
                {POI_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, poiCategory: category }))}
                    className={
                      (form.poiCategory ?? "other") === category
                        ? "rounded-full bg-orange-500 px-3 py-1.5 text-lg font-medium text-black"
                        : "rounded-full bg-[#1d1028] px-3 py-1.5 text-lg text-orange-100 ring-1 ring-orange-500/30"
                    }
                  >
                    {poiCategoryLabels[category]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </FormSection>
      ) : null}
      <FormSection title={isPoi ? "נקודת העניין" : "הבית"}>
        <Field
          label="מי מוסיף את הבית?"
          charCount={{ length: addedBy.length, max: HOUSE_FIELD_LIMITS.addedBy.max }}
        >
          <Input
            required={isNewHouse}
            value={addedBy}
            minLength={isNewHouse ? HOUSE_FIELD_LIMITS.addedBy.min : undefined}
            maxLength={HOUSE_FIELD_LIMITS.addedBy.max}
            onChange={(e) => setAddedBy(e.target.value)}
            placeholder="ישראל כהן"
            className="h-11 bg-[#1d1028] text-lg"
          />
        </Field>
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-lg font-medium">{isPoi ? "שם המקום" : "שם הבית"}</p>
            <CharCount length={form.name.length} max={HOUSE_FIELD_LIMITS.name.max} />
          </div>
          <Input
            required
            value={form.name}
            minLength={HOUSE_FIELD_LIMITS.name.min}
            maxLength={HOUSE_FIELD_LIMITS.name.max}
            onChange={(e) => {
              const name = e.target.value;
              const theme = themeFromName(name) ?? form.theme;
              setForm({ ...form, name, theme });
            }}
            placeholder="בית משפחת לוי, או בחרו הצעה"
            className="h-11 bg-[#1d1028] text-lg"
          />
          <p className="mt-2 text-lg text-violet-300">הצעות לשם — לחיצה ממלאת את השדה</p>
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
                      ? "rounded-full bg-orange-500 px-3 py-1.5 text-lg font-medium text-black"
                      : "rounded-full bg-[#1d1028] px-3 py-1.5 text-lg text-orange-100 ring-1 ring-orange-500/30"
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
        <Field
          label="כתובת"
          charCount={{ length: form.address.length, max: HOUSE_FIELD_LIMITS.address.max }}
        >
          <AddressField
            value={form.address}
            onChange={onAddressTyped}
            onSelect={onAddressSelect}
            confirmed={addressOk}
            disabled={blocked}
            maxLength={HOUSE_FIELD_LIMITS.address.max}
          />
        </Field>
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-lg font-medium">סיכה על המפה</p>
            <Button type="button" size="sm" variant="outline" onClick={useMyLocation}>
              {locating ? "מאתרים…" : "המיקום שלי"}
            </Button>
          </div>
          <p className="mb-2 text-lg text-violet-300">
            אחרי בחירת כתובת הסיכה זזה לשם. אפשר לגרור אותה לכניסה המדויקת.
          </p>
          <div className="relative z-0 isolate h-72 overflow-hidden rounded-xl ring-1 ring-orange-500/30">
            <HouseMapDynamic
              pickMode
              pick={{ lat: form.lat, lng: form.lng }}
              onPick={(lat, lng) => void syncFromPin(lat, lng)}
            />
          </div>
          <p className="mt-1 text-lg text-violet-300">
            מיקום: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
          </p>
        </div>
        <Field
          label="איפה הדלת (קומה, דירה)"
          charCount={{ length: form.arrival.length, max: HOUSE_FIELD_LIMITS.arrival.max }}
        >
          <Input
            value={form.arrival}
            maxLength={HOUSE_FIELD_LIMITS.arrival.max}
            onChange={(e) => setForm({ ...form, arrival: e.target.value })}
            placeholder="קומה 2, דירה 5, ימינה אחרי השער"
          />
        </Field>
        <Field
          label="הערה למבקרים"
          charCount={{ length: form.notes.length, max: HOUSE_FIELD_LIMITS.notes.max }}
        >
          <Input
            value={form.notes}
            maxLength={HOUSE_FIELD_LIMITS.notes.max}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="כלב, מדרגות, או משהו שלא קשור להגעה"
          />
          <p className="text-base text-violet-400">
            מופיעה בכרטיס בנפרד מהוראות ההגעה — למשל כלב, מדרגות, או הערה כללית.
          </p>
        </Field>
      </FormSection>
      <FormSection title="מתי פתוחים">
        <div className="space-y-3">
          <p className="text-lg font-medium">שעות ב־31 באוקטובר</p>
          <p className="text-lg text-violet-300">
            הבתים פתוחים רק בליל האלווין. אפשר כמה חלונות בערב (למשל 17:00–18:00, 19:00–20:00) אם
            יוצאים באמצע לטריק-אור-טריט.
          </p>
          {hourWindows.map((window, index) => (
            <div
              key={`hours-${index}`}
              className="space-y-2 rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-medium text-orange-100">
                  {hourWindows.length === 1 ? "חלון שעות" : `חלון ${index + 1}`}
                </p>
                {hourWindows.length > 1 ? (
                  <button
                    type="button"
                    className="text-lg text-violet-300 underline-offset-2 hover:underline"
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
              className="text-lg font-medium text-orange-300 underline-offset-2 hover:underline"
              onClick={addHourWindow}
            >
              + הוספת חלון שעות
            </button>
          ) : null}
          {hoursIssue ? <p className="text-lg text-red-300">{hoursIssue}</p> : null}
        </div>
        <div className="space-y-2 rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20">
          <p className="text-lg font-medium text-orange-100">סגירה או הפסקה ידנית בערב האירוע</p>
          {!pauseCloseEnabled ? (
            <p className="text-lg text-violet-300">
              האפשרות לסמן סגירה או הפסקה תתאפשר בערב האירוע
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5">
            <NightStatusChip
              label="פתוח"
              dotClass="is-open"
              selected={nightStatus === "open"}
              onClick={() => setNightStatus("open")}
            />
            {pauseCloseEnabled ? (
              <>
                <NightStatusChip
                  label="הפסקה"
                  dotClass="is-break"
                  selected={nightStatus === "pause"}
                  onClick={() => setNightStatus("pause")}
                />
                <NightStatusChip
                  label="סגור"
                  dotClass="is-closed"
                  selected={nightStatus === "stop"}
                  onClick={() => setNightStatus("stop")}
                />
              </>
            ) : (
              <div
                className="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-black/25 px-2 py-1.5"
                aria-hidden
              >
                <NightStatusChip label="הפסקה" dotClass="is-break" locked />
                <NightStatusChip label="סגור" dotClass="is-closed" locked />
              </div>
            )}
          </div>
        </div>
      </FormSection>
      <FormSection title="מה יפגשו בבית">
        <div>
          <p className="mb-2 text-lg font-medium">רמת פחד</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setDecorLevel("none")}
              className={
                undecorated
                  ? "inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-lg font-medium text-black"
                  : "inline-flex items-center gap-1.5 rounded-full bg-[#1d1028] px-3 py-1.5 text-lg text-orange-100 ring-1 ring-orange-500/30"
              }
            >
              <ScareSign Glyph={scareGlyph} level="none" className="size-6" />
              {decorShort.none}
            </button>
            {(["mild", "medium", "spicy"] as ScareLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => pickScare(level)}
                className={
                  !undecorated && form.scareLevel === level
                    ? "inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-lg font-medium text-black"
                    : "inline-flex items-center gap-1.5 rounded-full bg-[#1d1028] px-3 py-1.5 text-lg text-orange-100 ring-1 ring-orange-500/30"
                }
              >
                <ScareSign Glyph={scareGlyph} level={level} className="size-6" />
                {scareShort[level]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-lg font-medium">ממתקים</p>
          <div className="flex flex-wrap gap-1.5">
            {CANDY_TONES.map((tone) => (
              <button
                key={tone.id}
                type="button"
                onClick={() => pickCandy(tone.id)}
                className={
                  candy === tone.id
                    ? "inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-lg font-medium text-black"
                    : "inline-flex items-center gap-1.5 rounded-full bg-[#1d1028] px-3 py-1.5 text-lg text-orange-100 ring-1 ring-orange-500/30"
                }
              >
                <CandySign tone={tone.id} className="size-6" />
                {tone.label}
              </button>
            ))}
          </div>
        </div>
        <div
          className={
            candyOffered
              ? "space-y-2 rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20"
              : "space-y-2 rounded-xl bg-[#1d1028] p-3 opacity-45 ring-1 ring-orange-500/15"
          }
        >
          <p className="text-lg font-medium text-orange-100">רגישויות והתאמות</p>
          <p className="text-lg text-violet-300">
            {candyOffered
              ? "סמנו מה יש בבית לילדים עם רגישויות"
              : "בחרו יש או מעט ממתקים כדי לסמן רגישויות"}
          </p>
          <div className="space-y-2">
            {SENSITIVITY_OPTIONS.map((id) => (
              <label key={id} className="flex items-center gap-2 text-lg text-orange-50">
                <input
                  type="checkbox"
                  className="size-5 accent-orange-500"
                  disabled={!candyOffered}
                  checked={candyOffered && form.treats.includes(id)}
                  onChange={(e) => setTreat(id, e.target.checked)}
                />
                <SensitivityMark labeled kind={id} />
              </label>
            ))}
          </div>
        </div>
        <Field
          label="מה מחכה בבית?"
          charCount={{ length: form.description.length, max: HOUSE_FIELD_LIMITS.description.max }}
        >
          <Textarea
            value={form.description}
            maxLength={HOUSE_FIELD_LIMITS.description.max}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="קישוטים, אווירה, הפתעות בבית או בחצר…"
            className="min-h-24 text-lg"
          />
          <p className="text-base text-violet-400">מופיע בכרטיס — אפשר להרחיב אם הטקסט ארוך.</p>
        </Field>
      </FormSection>
      <FormSection title="הכניסה">
        <label className="flex items-start gap-2 rounded-xl bg-[#1d1028] p-3 text-lg ring-1 ring-orange-500/20">
          <input
            type="checkbox"
            className="mt-1 size-5 accent-orange-500"
            checked={form.accessible}
            onChange={(e) => setForm({ ...form, accessible: e.target.checked })}
          />
          <span>
            <span className="inline-flex items-center gap-2 font-medium text-orange-100">
              <StrollerSign />
              נגיש
            </span>
            <span className="block text-lg text-violet-300">
              בלי מדרגות בכניסה, מתאים לעגלה או לכיסא גלגלים
            </span>
          </span>
        </label>
      </FormSection>
      <FormSection title="תמונת קישוט">
        <p className="text-lg text-violet-300">אפשר גם להעלות אחרי שתקשטו את הבית.</p>
        {photoPreview || (existingPhoto && !clearPhoto) ? (
          <div className="mb-2 space-y-2">
            <HousePhotoFrame
              src={photoPreview || existingPhoto}
              focus={photoPreview ? photoFocus : { x: 50, y: 50 }}
              onFocusChange={photoPreview ? setPhotoFocus : undefined}
            />
            {photoPreview ? (
              <p className="text-lg text-violet-300">גררו את התמונה כדי לבחור את המרכז שיופיע בכרטיס</p>
            ) : null}
          </div>
        ) : (
          <div
            className={`${HOUSE_CARD_PHOTO_BOX} mb-2 flex items-center justify-center bg-[#1d1028] text-center text-lg text-violet-400`}
          >
            אין תמונה עדיין
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer">
            <span
              className={
                blocked
                  ? "inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-lg font-medium text-white opacity-60"
                  : "inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-lg font-medium text-white"
              }
            >
              <Camera className="size-3.5" />
              {photoPreview || (existingPhoto && !clearPhoto) ? "החלפת תמונה" : "העלאת תמונה"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={blocked}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setPhotoFile(file);
                setPhotoFocus({ x: 50, y: 50 });
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
              disabled={blocked}
              className="rounded-lg px-3 py-2 text-lg text-violet-200 ring-1 ring-orange-500/30"
              onClick={() => {
                setPhotoFile(null);
                setPhotoPreview(null);
                setPhotoFocus({ x: 50, y: 50 });
                setClearPhoto(true);
              }}
            >
              הסרת תמונה
            </button>
          ) : null}
        </div>
      </FormSection>
      <div className={onCancel ? "flex gap-2" : undefined}>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={blocked}
            className="h-11 flex-1 text-lg"
            onClick={onCancel}
          >
            ביטול
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={blocked}
          className={
            onCancel
              ? "h-11 flex-1 text-lg bg-orange-500 text-black hover:bg-orange-400"
              : "h-11 w-full text-lg bg-orange-500 text-black hover:bg-orange-400"
          }
        >
          {blocked ? "שומרים בשרת…" : submitLabel}
        </Button>
      </div>
      {extraActions}
    </form>
  );
}

function NightStatusChip({
  label,
  dotClass,
  selected = false,
  locked = false,
  onClick,
}: {
  label: string;
  dotClass: string;
  selected?: boolean;
  locked?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-lg font-medium",
    locked
      ? "cursor-not-allowed text-violet-400/55 ring-1 ring-white/10"
      : selected
        ? "bg-orange-500 text-black"
        : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/30",
  );

  if (locked) {
    return (
      <span className={className}>
        <span className={cn("night-status-dot opacity-40", dotClass)} />
        {label}
      </span>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      <span className={cn("night-status-dot", dotClass)} />
      {label}
    </button>
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
      <h2 className="border-b border-orange-500/25 pb-1 text-xl font-semibold text-orange-200">
        {title}
      </h2>
      {children}
    </section>
  );
}

function CharCount({ length, max }: { length: number; max: number }) {
  return (
    <span
      className={cn(
        "shrink-0 text-base tabular-nums",
        length >= max ? "text-orange-300" : "text-violet-400",
      )}
      aria-live="polite"
    >
      {length}/{max}
    </span>
  );
}

function Field({
  label,
  children,
  charCount,
}: {
  label: string;
  children: ReactNode;
  charCount?: { length: number; max: number };
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label>{label}</Label>
        {charCount ? <CharCount {...charCount} /> : null}
      </div>
      {children}
    </div>
  );
}

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
    <input
      type="time"
      required={required}
      dir="ltr"
      lang="he-IL"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="filter-time-input h-11 w-full min-w-0 min-h-11 rounded-lg border border-input bg-[#1d1028] px-2.5 py-2 text-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}
