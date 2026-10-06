"use client";

import { useCallback, useEffect, useState } from "react";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SettingsResponse = {
  addressReveal: { hour: number; minute: number };
  customized: boolean;
  defaults: { hour: number; minute: number };
  updatedAt?: string;
};

function formatTimeInput({ hour, minute }: { hour: number; minute: number }) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTimeInput(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function AdminAddressRevealSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customized, setCustomized] = useState(false);
  const [defaults, setDefaults] = useState({ hour: 12, minute: 0 });
  const [timeValue, setTimeValue] = useState("12:00");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/event/address-reveal", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as SettingsResponse & { error?: string };
      if (!res.ok) {
        setError(json?.error ?? "טעינת ההגדרות נכשלה.");
        return;
      }
      setCustomized(Boolean(json.customized));
      setDefaults(json.defaults);
      setTimeValue(formatTimeInput(json.addressReveal));
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
    const parsed = parseTimeInput(timeValue);
    if (!parsed) {
      setError("יש לבחור שעה תקינה.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/event/address-reveal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const json = (await res.json().catch(() => null)) as SettingsResponse & { error?: string };
      if (!res.ok) {
        setError(json?.error ?? "שמירה נכשלה.");
        return;
      }
      setCustomized(Boolean(json.customized));
      setDefaults(json.defaults);
      setTimeValue(formatTimeInput(json.addressReveal));
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
      const res = await fetch("/api/admin/event/address-reveal", {
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
      setTimeValue(formatTimeInput(json.addressReveal));
    } catch {
      setError("איפוס נכשל.");
    } finally {
      setSaving(false);
    }
  }

  const defaultLabel = formatTimeInput(defaults);

  return (
    <div className="space-y-2 rounded-xl bg-[#12081a] px-3 py-2 ring-1 ring-orange-500/20">
      <p className="text-base font-medium text-orange-100">
        חשיפת כתובות · {config.eventNight.labelHe} — שעה מקומית לפתיחת כתובות והוראות הגעה (מסונכרן,
        נפרד משעון בדיקות)
      </p>
      <label className={cn("block space-y-1", loading && "opacity-50")}>
        <span className="text-sm text-violet-300">שעת חשיפה</span>
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
      <p className="text-sm text-violet-400">
        ברירת מחדל{" "}
        <span dir="ltr" className="text-violet-200">
          {defaultLabel}
        </span>
        {customized ? <span className="text-orange-200"> · מוגדר במנהל</span> : null}
      </p>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
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
            איפוס
          </Button>
        ) : null}
      </div>
    </div>
  );
}
