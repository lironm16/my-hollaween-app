"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AddressField, reversePin } from "@/components/address-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { scareLabels, suggestedHouseName, nameMatchesTheme, themeFromName } from "@/lib/labels";
import { config, inNeighborhood } from "@/lib/config";
import type { AddressHit } from "@/lib/types";
import { streetPinHint } from "@/lib/address-text";
import {
  HOUSE_THEMES,
  SENSITIVITY_OPTIONS,
  type HouseInput,
  type ScareLevel,
  type TreatId,
  type VisitState,
} from "@/lib/types";
import { treatLabels } from "@/lib/labels";
import { candyLevel, effectiveVisit } from "@/lib/house-state";

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
  notes: "",
  accessible: false,
  visit: "come",
  treatStock: { candy: "plenty" },
};

function initialHasCandy(initial?: Partial<HouseInput>) {
  if (!initial) return true;
  const treats = initial.treats ?? ["candy"];
  return candyLevel({ treats, treatStock: initial.treatStock }) !== "out";
}

function initialDecorated(initial?: Partial<HouseInput>) {
  if (!initial) return true;
  return effectiveVisit(initial) !== "closed";
}

export function HouseForm({
  initial,
  submitLabel,
  onSubmit,
  busy,
}: {
  initial?: Partial<HouseInput>;
  submitLabel: string;
  onSubmit: (input: HouseInput) => Promise<void> | void;
  busy?: boolean;
}) {
  const [form, setForm] = useState<HouseInput>({ ...empty, ...initial });
  const [locating, setLocating] = useState(false);
  const [addressOk, setAddressOk] = useState(Boolean(initial?.address && initial.lat && initial.lng));
  const [decorated, setDecorated] = useState(() => initialDecorated(initial));
  const [hasCandy, setHasCandy] = useState(() => initialHasCandy(initial));

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
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!addressOk) {
          toast.error("בחרו כתובת אמיתית מהרשימה, או גררו את הסיכה לבית.");
          return;
        }
        if (!decorated && !hasCandy) {
          toast.error("סמנו לפחות קישוטים או ממתקים — אחרת אין סיבה להוסיף את הבית למפה.");
          return;
        }
        const theme = themeFromName(form.name) ?? form.theme;
        const clock = (value: string) => (/^\d{2}:\d{2}/.exec(value)?.[0] ?? value);
        const withoutCandy = form.treats.filter((id) => id !== "candy");
        const treats = hasCandy ? (["candy" as const, ...withoutCandy] as TreatId[]) : withoutCandy;
        const treatStock = { ...(form.treatStock ?? {}) };
        if (hasCandy) treatStock.candy = treatStock.candy ?? "plenty";
        else delete treatStock.candy;
        const visit: VisitState = hasCandy ? "come" : decorated ? "decorOnly" : "come";
        void onSubmit({
          ...form,
          theme,
          treats,
          treatStock,
          visit,
          openFrom: clock(form.openFrom),
          openTo: clock(form.openTo),
        });
      }}
    >
      <div>
        <p className="mb-2 text-sm font-medium">שם הבית</p>
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
        <p className="mt-2 text-xs text-violet-300">הצעות לשם — לחיצה ממלאת את השדה</p>
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
                    ? "rounded-full bg-orange-500 px-3 py-1.5 text-xs font-medium text-black"
                    : "rounded-full bg-[#1d1028] px-3 py-1.5 text-xs text-orange-100 ring-1 ring-orange-500/30"
                }
              >
                {suggestedHouseName(theme)}
              </button>
            );
          })}
        </div>
      </div>
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
          <p className="text-sm font-medium">סיכה על המפה</p>
          <Button type="button" size="sm" variant="outline" onClick={useMyLocation}>
            {locating ? "מאתרים…" : "המיקום שלי"}
          </Button>
        </div>
        <p className="mb-2 text-xs text-violet-300">
          אחרי בחירת כתובת הסיכה זזה לשם. אפשר לגרור אותה לכניסה המדויקת.
        </p>
        <div className="relative z-0 isolate h-72 overflow-hidden rounded-xl ring-1 ring-orange-500/30">
          <HouseMapDynamic
            pickMode
            pick={{ lat: form.lat, lng: form.lng }}
            onPick={(lat, lng) => void syncFromPin(lat, lng)}
          />
        </div>
        <p className="mt-1 text-xs text-violet-300">
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
      <label className="flex items-start gap-2 rounded-xl bg-[#1d1028] p-3 text-sm ring-1 ring-orange-500/20">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-orange-500"
          checked={form.accessible}
          onChange={(e) => setForm({ ...form, accessible: e.target.checked })}
        />
        <span>
          <span className="font-medium text-orange-100">נגיש</span>
          <span className="block text-xs text-violet-300">
            בלי מדרגות בכניסה, מתאים לעגלה או לכיסא גלגלים
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2 rounded-xl bg-[#1d1028] p-3 text-sm ring-1 ring-orange-500/20">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-orange-500"
          checked={decorated}
          onChange={(e) => setDecorated(e.target.checked)}
        />
        <span>
          <span className="font-medium text-orange-100">הבית מקושט</span>
          <span className="block text-xs text-violet-300">
            יש קישוטי האלווין שאפשר לראות מבחוץ או בכניסה
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2 rounded-xl bg-[#1d1028] p-3 text-sm ring-1 ring-orange-500/20">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-orange-500"
          checked={hasCandy}
          onChange={(e) => setHasCandy(e.target.checked)}
        />
        <span>
          <span className="font-medium text-orange-100">יהיו ממתקים</span>
          <span className="block text-xs text-violet-300">
            מחלקים ממתקים או שוקולד לילדים שמגיעים
          </span>
        </span>
      </label>
      <div className="space-y-2 rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20">
        <p className="text-sm font-medium text-orange-100">רגישויות והתאמות</p>
        <p className="text-xs text-violet-300">סמנו מה יש בבית לילדים עם רגישויות</p>
        <div className="space-y-2">
          {SENSITIVITY_OPTIONS.map((id) => (
            <label key={id} className="flex items-center gap-2 text-sm text-orange-50">
              <input
                type="checkbox"
                className="size-4 accent-orange-500"
                checked={form.treats.includes(id)}
                onChange={(e) => setTreat(id, e.target.checked)}
              />
              {treatLabels[id]}
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
      <div className="grid grid-cols-1 gap-3">
        <Field label="פתיחה">
          <TimeField
            required
            value={form.openFrom}
            onChange={(openFrom) => setForm({ ...form, openFrom })}
          />
        </Field>
        <Field label="סגירה">
          <TimeField
            required
            value={form.openTo}
            onChange={(openTo) => setForm({ ...form, openTo })}
          />
        </Field>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">רמת פחד</p>
        <div className="flex flex-wrap gap-1.5">
          {(["mild", "medium", "spicy"] as ScareLevel[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setForm({ ...form, scareLevel: level })}
              className={
                form.scareLevel === level
                  ? "rounded-full bg-orange-500 px-3 py-1.5 text-xs font-medium text-black"
                  : "rounded-full bg-[#1d1028] px-3 py-1.5 text-xs text-orange-100 ring-1 ring-orange-500/30"
              }
            >
              {scareLabels[level]}
            </button>
          ))}
        </div>
      </div>
      <Field label="הערות (כלב, מדרגות, עגלה…)">
        <Input
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Field>
      <Button
        type="submit"
        disabled={busy}
        className="h-10 w-full bg-orange-500 text-black hover:bg-orange-400"
      >
        {busy ? "שולחים…" : submitLabel}
      </Button>
    </form>
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
