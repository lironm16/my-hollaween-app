"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AddressField, reversePin } from "@/components/address-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { treatLabels, scareLabels, suggestedHouseName, nameMatchesTheme, themeFromName } from "@/lib/labels";
import { config, inNeighborhood } from "@/lib/config";
import type { AddressHit } from "@/lib/types";
import {
  HOUSE_THEMES,
  TREAT_OPTIONS,
  type HouseInput,
  type ScareLevel,
  type TreatId,
} from "@/lib/types";

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
};

export function HouseForm({
  initial,
  submitLabel,
  onSubmit,
  busy,
  showSoldOut,
  soldOut,
  onSoldOutChange,
}: {
  initial?: Partial<HouseInput>;
  submitLabel: string;
  onSubmit: (input: HouseInput) => Promise<void> | void;
  busy?: boolean;
  showSoldOut?: boolean;
  soldOut?: boolean;
  onSoldOutChange?: (v: boolean) => void;
}) {
  const [form, setForm] = useState<HouseInput>({ ...empty, ...initial });
  const [locating, setLocating] = useState(false);
  const [addressOk, setAddressOk] = useState(Boolean(initial?.address && initial.lat && initial.lng));

  function toggleTreat(id: TreatId) {
    setForm((f) => ({
      ...f,
      treats: f.treats.includes(id)
        ? f.treats.filter((t) => t !== id)
        : [...f.treats, id],
    }));
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
      toast.message("סימנו את הרחוב. גררו את הסיכה עד לבית שלכם.");
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
        const theme = themeFromName(form.name) ?? form.theme;
        void onSubmit({ ...form, theme });
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
      <Field label="מה מחכה בבית?">
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="קישוטים, אווירה, הפתעות…"
          className="min-h-24"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="פתיחה">
          <Input
            type="time"
            required
            value={form.openFrom}
            onChange={(e) => setForm({ ...form, openFrom: e.target.value })}
          />
        </Field>
        <Field label="סגירה">
          <Input
            type="time"
            required
            value={form.openTo}
            onChange={(e) => setForm({ ...form, openTo: e.target.value })}
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
      <div>
        <p className="mb-2 text-sm font-medium">מה מחלקים</p>
        <div className="flex flex-wrap gap-1.5">
          {TREAT_OPTIONS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleTreat(id)}
              className={
                form.treats.includes(id)
                  ? "rounded-full bg-violet-600 px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-full bg-[#1d1028] px-3 py-1.5 text-xs text-violet-100 ring-1 ring-violet-500/30"
              }
            >
              {treatLabels[id]}
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
      {showSoldOut ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-orange-500"
            checked={Boolean(soldOut)}
            onChange={(e) => onSoldOutChange?.(e.target.checked)}
          />
          נגמרו הממתקים
        </label>
      ) : null}
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
