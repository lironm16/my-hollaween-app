"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EventOpenHoursSchedule } from "@/lib/types";
import { FormPrimarySecondaryActions } from "@/components/form-primary-secondary-actions";
import { cn } from "@/lib/utils";

type SettingsResponse = {
  eventOpenHours: EventOpenHoursSchedule;
  customized: boolean;
  defaults: EventOpenHoursSchedule;
  updatedAt?: string;
};

function formatDateInput({ year, month, day }: Pick<EventOpenHoursSchedule, "year" | "month" | "day">) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateInput(value: string): Pick<EventOpenHoursSchedule, "year" | "month" | "day"> | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function AdminEventOpenHoursSettings({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SettingsResponse | null>(null);
  const [dateValue, setDateValue] = useState("2026-10-31");
  const [fromValue, setFromValue] = useState("17:00");
  const [toValue, setToValue] = useState("20:00");

  const dirty = useMemo(() => {
    if (!saved) return false;
    const s = saved.eventOpenHours;
    return (
      dateValue !== formatDateInput(s) ||
      fromValue !== s.openFrom ||
      toValue !== s.openTo
    );
  }, [dateValue, fromValue, saved, toValue]);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/event/open-hours", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as SettingsResponse & { error?: string };
      if (!res.ok) {
        setError(json?.error ?? "טעינת ההגדרות נכשלה.");
        return;
      }
      setSaved(json);
      setDateValue(formatDateInput(json.eventOpenHours));
      setFromValue(json.eventOpenHours.openFrom);
      setToValue(json.eventOpenHours.openTo);
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
    if (!date || !fromValue.trim() || !toValue.trim()) {
      setError("יש למלא תאריך ושעות תקינים.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/event/open-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...date, openFrom: fromValue.trim(), openTo: toValue.trim() }),
      });
      const json = (await res.json().catch(() => null)) as SettingsResponse & { error?: string };
      if (!res.ok) {
        setError(json?.error ?? "שמירה נכשלה.");
        return;
      }
      setSaved(json);
      setDateValue(formatDateInput(json.eventOpenHours));
      setFromValue(json.eventOpenHours.openFrom);
      setToValue(json.eventOpenHours.openTo);
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
      const res = await fetch("/api/admin/event/open-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const json = (await res.json().catch(() => null)) as SettingsResponse & { error?: string };
      if (!res.ok) {
        setError(json?.error ?? "איפוס נכשל.");
        return;
      }
      setSaved(json);
      setDateValue(formatDateInput(json.eventOpenHours));
      setFromValue(json.eventOpenHours.openFrom);
      setToValue(json.eventOpenHours.openTo);
    } catch {
      setError("איפוס נכשל.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("space-y-2", embedded ? "" : "rounded-xl bg-[#1a0a24] p-3 ring-1 ring-orange-500/20")}>
      <p className="text-sm font-medium text-orange-100">ליל האירוע · שעות ברירת מחדל</p>
      <p className="text-xs text-violet-400">
        משפיע על ברירת המחדל ב&quot;הוספת בית&quot; ועל בדיקת חריגות בשעות.
      </p>
      {loading ? <p className="text-sm text-violet-300">טוען…</p> : null}
      {error ? <p className="text-sm text-amber-300">{error}</p> : null}
      <label className="block space-y-1">
        <span className="text-sm text-violet-300">תאריך האירוע</span>
        <input
          type="date"
          value={dateValue}
          disabled={loading || saving}
          onChange={(event) => setDateValue(event.target.value)}
          className="filter-time-input h-9 w-full min-h-9 rounded-md bg-[#14081c] px-2 text-sm text-orange-50 ring-1 ring-orange-500/20 disabled:opacity-50"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="text-sm text-violet-300">פתיחה</span>
          <input
            type="time"
            value={fromValue}
            disabled={loading || saving}
            onChange={(event) => setFromValue(event.target.value)}
            className="filter-time-input h-9 w-full min-h-9 rounded-md bg-[#14081c] px-2 text-sm text-orange-50 ring-1 ring-orange-500/20 disabled:opacity-50"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-violet-300">סגירה</span>
          <input
            type="time"
            value={toValue}
            disabled={loading || saving}
            onChange={(event) => setToValue(event.target.value)}
            className="filter-time-input h-9 w-full min-h-9 rounded-md bg-[#14081c] px-2 text-sm text-orange-50 ring-1 ring-orange-500/20 disabled:opacity-50"
          />
        </label>
      </div>
      <FormPrimarySecondaryActions
        primaryLabel={saving ? "שומר…" : "שמירה"}
        primaryDisabled={!dirty || saving || loading}
        onPrimary={() => void onSave()}
        secondaryLabel="ברירת מחדל"
        secondaryDisabled={saving || loading || !saved?.customized}
        onSecondary={() => void onReset()}
      />
    </div>
  );
}
