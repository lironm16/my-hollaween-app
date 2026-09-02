"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { treatLabels, scareLabels } from "@/lib/labels";
import { config } from "@/lib/config";
import {
  TREAT_OPTIONS,
  type HouseInput,
  type ScareLevel,
  type TreatId,
} from "@/lib/types";

const empty: HouseInput = {
  name: "",
  address: "",
  description: "",
  lat: config.map.center.lat,
  lng: config.map.center.lng,
  treats: ["candy"],
  scareLevel: "mild",
  openFrom: "17:00",
  openTo: "21:00",
  notes: "",
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
  const [picked, setPicked] = useState(Boolean(initial?.lat && initial?.lng));

  function toggleTreat(id: TreatId) {
    setForm((f) => ({
      ...f,
      treats: f.treats.includes(id)
        ? f.treats.filter((t) => t !== id)
        : [...f.treats, id],
    }));
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!picked) return;
        void onSubmit(form);
      }}
    >
      <Field label="שם הבית / המשפחה">
        <Input
          required
          value={form.name}
          minLength={2}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="למשל בית משפחת לוי"
        />
      </Field>
      <Field label="כתובת">
        <Input
          required
          value={form.address}
          minLength={3}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="רחוב ומספר"
        />
      </Field>
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
            checked={Boolean(soldOut)}
            onChange={(e) => onSoldOutChange?.(e.target.checked)}
          />
          נגמרו הממתקים
        </label>
      ) : null}
      <div>
        <p className="mb-2 text-sm font-medium">
          לחצו על המפה כדי לסמן את הבית
          {picked ? "" : " — חובה"}
        </p>
        <div className="h-64 overflow-hidden rounded-xl ring-1 ring-orange-500/30">
          <HouseMapDynamic
            pickMode
            pick={picked ? { lat: form.lat, lng: form.lng } : null}
            onPick={(lat, lng) => {
              setForm((f) => ({ ...f, lat, lng }));
              setPicked(true);
            }}
          />
        </div>
        {picked ? (
          <p className="mt-1 text-xs text-violet-300">
            מיקום: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
          </p>
        ) : (
          <p className="mt-1 text-xs text-amber-300">עדיין לא נבחר מיקום.</p>
        )}
      </div>
      <Button
        type="submit"
        disabled={busy || !picked}
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
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
