"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { eventNightDateLabel } from "@/lib/address-reveal";
import { FormPrimarySecondaryActions } from "@/components/form-primary-secondary-actions";
import { useLocale } from "@/hooks/use-locale";
import { formatMessage } from "@/lib/i18n/format";
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

export function AdminAddressRevealSettings({ embedded = false }: { embedded?: boolean }) {
  const { locale, t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedTimeValue, setSavedTimeValue] = useState("12:00");
  const [timeValue, setTimeValue] = useState("12:00");

  const dirty = useMemo(() => timeValue !== savedTimeValue, [savedTimeValue, timeValue]);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/event/address-reveal", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as SettingsResponse & { error?: string };
      if (!res.ok) {
        setError(json?.error ?? t("adminSettings.common.loadFailed"));
        return;
      }
      const next = formatTimeInput(json.addressReveal);
      setSavedTimeValue(next);
      setTimeValue(next);
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
    const parsed = parseTimeInput(timeValue);
    if (!parsed) {
      setError(t("adminSettings.addressReveal.invalidTime"));
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
        setError(json?.error ?? t("adminSettings.common.saveFailed"));
        return;
      }
      const next = formatTimeInput(json.addressReveal);
      setSavedTimeValue(next);
      setTimeValue(next);
    } catch {
      setError(t("adminSettings.common.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function onCancelEdit() {
    setError("");
    setTimeValue(savedTimeValue);
  }

  const title = formatMessage(t("adminSettings.addressReveal.title"), {
    date: eventNightDateLabel(locale),
  });

  return (
    <div
      className={cn(
        "space-y-2",
        embedded ? "rounded-lg bg-[#14081c]/80 px-2.5 py-2 ring-1 ring-orange-500/10" : "rounded-xl bg-[#12081a] px-3 py-2 ring-1 ring-orange-500/20",
      )}
    >
      <p className="text-sm font-medium text-orange-100">{title}</p>
      {!embedded ? (
        <p className="text-sm text-violet-400">{t("adminSettings.addressReveal.hint")}</p>
      ) : null}
      <label className={cn("block space-y-1", loading && "opacity-50")}>
        <span className="text-sm text-violet-300">{t("adminSettings.addressReveal.revealTime")}</span>
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
