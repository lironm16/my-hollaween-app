"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminHelpDetails } from "@/components/admin-section";
import { Button } from "@/components/ui/button";
import type { AdminNightPassDevicesResponse } from "@/lib/admin-night-pass-devices";
import { useLocale } from "@/hooks/use-locale";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

export function AdminNightPassDeviceSummary({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLocale();
  const [data, setData] = useState<AdminNightPassDevicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showZeros, setShowZeros] = useState(false);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/event/night-passes/devices", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as
        | AdminNightPassDevicesResponse
        | { error?: string }
        | null;
      if (!res.ok) {
        setError(
          (json && "error" in json && json.error) ||
            (res.status === 404
              ? t("adminNightPassDevices.routeMissing")
              : formatMessage(t("adminNightPassDevices.loadFailedStatus"), {
                  status: String(res.status),
                })),
        );
        setData(null);
        return;
      }
      if (!json || !("houses" in json) || !Array.isArray(json.houses)) {
        setError(t("adminNightPassDevices.invalidResponse"));
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError(t("adminNightPassDevices.loadFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    if (!data) return [];
    return showZeros ? data.houses : data.houses.filter((row) => row.connectedCount > 0);
  }, [data, showZeros]);

  const summaryLine = data
    ? formatMessage(t("adminNightPassDevices.summary"), {
        housesWithDevices: String(data.housesWithDevices),
        totalConnected: String(data.totalConnected),
        maxDevices: String(data.maxDevices),
      })
    : loading
      ? t("adminNightPassDevices.loading")
      : "—";

  return (
    <div
      className={cn(
        "space-y-2",
        embedded
          ? "rounded-lg bg-[#14081c]/80 px-2.5 py-2 ring-1 ring-orange-500/10"
          : "rounded-xl bg-[#12081a] px-3 py-2 ring-1 ring-orange-500/20",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-orange-100">{t("adminNightPassDevices.title")}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 border-orange-500/25 text-orange-100"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : t("adminNightPassDevices.refresh")}
        </Button>
      </div>
      <p className="text-sm text-violet-300">{summaryLine}</p>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {data && !data.enabled ? (
        <p className="text-sm text-amber-200/90">{t("adminNightPassDevices.codesOff")}</p>
      ) : null}
      {data && rows.length === 0 && !loading ? (
        <p className="text-sm text-violet-400">{t("adminNightPassDevices.noneConnected")}</p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="max-h-52 space-y-1 overflow-y-auto rounded-lg bg-black/25 px-2 py-1.5 ring-1 ring-orange-500/10">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-2 border-b border-orange-500/10 py-1.5 text-sm last:border-0"
            >
              <span className="min-w-0 truncate text-orange-50">{row.name}</span>
              <span
                className={cn(
                  "shrink-0 font-mono tabular-nums",
                  row.connectedCount >= row.maxDevices ? "text-amber-300" : "text-emerald-300",
                )}
              >
                {row.connectedCount}/{row.maxDevices}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {data && data.houses.some((row) => row.connectedCount === 0) ? (
        <button
          type="button"
          className="text-sm text-orange-300 underline underline-offset-2 hover:text-orange-200"
          onClick={() => setShowZeros((value) => !value)}
        >
          {showZeros ? t("adminNightPassDevices.hideZeros") : t("adminNightPassDevices.showZeros")}
        </button>
      ) : null}
      <AdminHelpDetails label={t("adminNightPassDevices.helpLabel")}>
        {t("adminNightPassDevices.help")}
      </AdminHelpDetails>
    </div>
  );
}
