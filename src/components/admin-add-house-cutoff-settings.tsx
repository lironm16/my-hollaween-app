"use client";

import { useCallback, useEffect, useState } from "react";
import { config } from "@/lib/config";
import type { AddHouseCutoffSchedule } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SettingsResponse = {
  addHouseCutoff: AddHouseCutoffSchedule;
  customized: boolean;
  defaults: AddHouseCutoffSchedule;
  updatedAt?: string;
};

function formatDateInput({ year, month, day }: Pick<AddHouseCutoffSchedule, "year" | "month" | "day">) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatTimeInput({ hour, minute }: Pick<AddHouseCutoffSchedule, "hour" | "minute">) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseDateInput(value: string): Pick<AddHouseCutoffSchedule, "year" | "month" | "day"> | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function parseTimeInput(value: string): Pick<AddHouseCutoffSchedule, "hour" | "minute"> | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function labelSchedule(schedule: AddHouseCutoffSchedule) {
  return `${formatDateInput(schedule).split("-").reverse().join("/")} ${formatTimeInput(schedule)}`;
}

export function AdminAddHouseCutoffSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customized, setCustomized] = useState(false);
  const [defaults, setDefaults] = useState<AddHouseCutoffSchedule>(() => ({
    year: config.addHouseCutoff.year,
    month: config.addHouseCutoff.month,
    day: config.addHouseCutoff.day,
    hour: config.addHouseCutoff.hour,
    minute: config.addHouseCutoff.minute,
  }));
  const [dateValue, setDateValue] = useState("2026-10-30");
  const [timeValue, setTimeValue] = useState("23:59");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/event/add-house-cutoff", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as SettingsResponse & { error?: string };
      if (!res.ok) {
        setError(json?.error ?? "טעינת ההגדרות נכשלה.");
        return;
      }
      setCustomized(Boolean(json.customized));
      setDefaults(json.defaults);
      setDateValue(formatDateInput(json.addHouseCutoff));
      setTimeValue(formatTimeInput(json.addHouseCutoff));
    } catch {
      setError("טעינת ההגדרות נכשלה.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    const date = parseDateInput(dateValue);
    const time = parseTimeInput(timeValue);
    if (!date || !time) {
      setError("יש לבחור תאריך ושעה תקינים.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/event/add-house-cutoff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...date, ...time }),
      });
      const json = (await res.json().catch(() => null)) as SettingsResponse & { error?: string };
      if (!res.ok) {
        setError(json?.error ?? "שמירה נכשלה.");
        return;
      }
      setCustomized(Boolean(json.customized));
      setDefaults(json.defaults);
      setDateValue(formatDateInput(json.addHouseCutoff));
      setTimeValue(formatTimeInput(json.addHouseCutoff));
    } catch {
      setError("שמירה נכשלה.");
    } finally {
      setSaving(false);
    }
  }

  async function onReset() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/event/add-house-cutoff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const json = (await res.json().catch(() => null)) as SettingsResponse & { error?: string };
      if (!res.ok) {
        setError(json?.error ?? "איפוס נכשל.");
        return;
      }
      setCustomized(false);
      setDefaults(json.defaults);
      setDateValue(formatDateInput(json.addHouseCutoff));
      setTimeValue(formatTimeInput(json.addHouseCutoff));
    } catch {
      setError("איפוס נכשל.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl bg-[#12081a] px-3 py-2.5 ring-1 ring-orange-500/20">
      <p className="text-base font-medium text-orange-100">חיתוך הוספת בתים</p>
      <p className="text-base text-violet-300">
        אחרי המועד הזה מבקרים לא יכולים לשלוח בית חדש (מנהלים תמיד יכולים). נשמר בשרת ומתעדכן בכל
        הטלפונים.
      </p>
      <div className={cn("grid gap-2 sm:grid-cols-2", loading && "opacity-50")}>
        <label className="block space-y-1.5">
          <span className="text-base text-violet-200">תאריך (מקומי)</span>
          <input
            type="date"
            value={dateValue}
            disabled={loading || saving}
            onChange={(event) => setDateValue(event.target.value)}
            className="filter-time-input h-10 w-full min-h-10 rounded-md bg-black/30 px-2 text-base text-orange-50 ring-1 ring-orange-500/20 disabled:cursor-not-allowed"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-base text-violet-200">שעה</span>
          <input
            type="time"
            value={timeValue}
            disabled={loading || saving}
            onChange={(event) => {
              const value = event.target.value;
              if (value) setTimeValue(value);
            }}
            className="filter-time-input h-10 w-full min-h-10 rounded-md bg-black/30 px-2 text-base text-orange-50 ring-1 ring-orange-500/20 disabled:cursor-not-allowed"
          />
        </label>
      </div>
      <p className="text-base text-violet-400">
        ברירת מחדל:{" "}
        <span dir="ltr" className="text-violet-200">
          {labelSchedule(defaults)}
        </span>
        {customized ? <span className="text-orange-200"> · מוגדר במנהל</span> : null}
      </p>
      {error ? <p className="text-base text-red-300">{error}</p> : null}
      <div className="flex flex-wrap gap-2 pt-0.5">
        <Button type="button" size="sm" disabled={loading || saving} onClick={() => void onSave()}>
          {saving ? "שומר…" : "שמירה"}
        </Button>
        {customized ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading || saving}
            onClick={() => void onReset()}
          >
            איפוס לברירת מחדל
          </Button>
        ) : null}
      </div>
    </div>
  );
}
