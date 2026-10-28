"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AddHouseCutoffSchedule } from "@/lib/types";
import { FormPrimarySecondaryActions } from "@/components/form-primary-secondary-actions";
import { useLocale } from "@/hooks/use-locale";
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

export function AdminAddHouseCutoffSettings({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedDateValue, setSavedDateValue] = useState("2026-10-30");
  const [savedTimeValue, setSavedTimeValue] = useState("23:59");
  const [dateValue, setDateValue] = useState("2026-10-30");
  const [timeValue, setTimeValue] = useState("23:59");

  const dirty = useMemo(
    () => dateValue !== savedDateValue || timeValue !== savedTimeValue,
    [dateValue, savedDateValue, savedTimeValue, timeValue],
  );

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/event/add-house-cutoff", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as SettingsResponse & { error?: string };
      if (!res.ok) {
        setError(json?.error ?? t("adminSettings.common.loadFailed"));
        return;
      }
      const nextDate = formatDateInput(json.addHouseCutoff);
      const nextTime = formatTimeInput(json.addHouseCutoff);
      setSavedDateValue(nextDate);
      setSavedTimeValue(nextTime);
      setDateValue(nextDate);
      setTimeValue(nextTime);
    } catch {
      setError(t("adminSettings.common.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    const date = parseDateInput(dateValue);
    const time = parseTimeInput(timeValue);
    if (!date || !time) {
      setError(t("adminSettings.addCutoff.invalidDateTime"));
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
        setError(json?.error ?? t("adminSettings.common.saveFailed"));
        return;
      }
      const nextDate = formatDateInput(json.addHouseCutoff);
      const nextTime = formatTimeInput(json.addHouseCutoff);
      setSavedDateValue(nextDate);
      setSavedTimeValue(nextTime);
      setDateValue(nextDate);
      setTimeValue(nextTime);
    } catch {
      setError(t("adminSettings.common.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function onCancelEdit() {
    setError("");
    setDateValue(savedDateValue);
    setTimeValue(savedTimeValue);
  }

  return (
    <div
      className={cn(
        "space-y-2",
        embedded ? "rounded-lg bg-[#14081c]/80 px-2.5 py-2 ring-1 ring-orange-500/10" : "rounded-xl bg-[#12081a] px-3 py-2 ring-1 ring-orange-500/20",
      )}
    >
      <p className="text-sm font-medium text-orange-100">{t("adminSettings.addCutoff.title")}</p>
      {!embedded ? (
        <p className="text-sm text-violet-400">{t("adminSettings.addCutoff.hint")}</p>
      ) : null}
      <div className={cn("grid gap-2 sm:grid-cols-2", loading && "opacity-50")}>
        <label className="block space-y-1">
          <span className="text-sm text-violet-300">{t("adminSettings.common.date")}</span>
          <input
            type="date"
            value={dateValue}
            disabled={loading || saving}
            onChange={(event) => setDateValue(event.target.value)}
            className="filter-time-input h-10 w-full min-h-10 rounded-md bg-black/30 px-2 text-base text-orange-50 ring-1 ring-orange-500/20 disabled:cursor-not-allowed"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-violet-300">{t("adminSettings.common.time")}</span>
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
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <FormPrimarySecondaryActions
        primaryLabel={saving ? t("adminSettings.common.saving") : t("adminSettings.common.save")}
        secondaryLabel={t("adminSettings.common.cancel")}
        onPrimary={() => void onSave()}
        onSecondary={onCancelEdit}
        primaryDisabled={loading || saving || !dirty}
        secondaryDisabled={loading || saving || !dirty}
      />
    </div>
  );
}
