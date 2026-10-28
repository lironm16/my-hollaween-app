"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ANOMALY_KIND_LABELS, type AnomalyListItem } from "@/lib/house-anomalies";
import { HOUSE_SETS, type HouseSet } from "@/lib/house-set";
import { useHouseSet } from "@/hooks/use-house-set";
import { useLocale } from "@/hooks/use-locale";
import { formatMessage } from "@/lib/i18n/format";
import type { EventOpenHoursSchedule, HouseAnomalyKind } from "@/lib/types";
import { cn } from "@/lib/utils";

type AnomaliesResponse = {
  items: AnomalyListItem[];
  eventOpenHours: EventOpenHoursSchedule;
  scannedAt: string;
  houseCount: number;
  houseSet?: HouseSet;
};

function itemKey(item: AnomalyListItem) {
  return item.clusterKey ? `${item.kind}:${item.clusterKey}` : `${item.houseId}:${item.kind}`;
}

function houseSetLabel(t: (key: string) => string, id: HouseSet) {
  if (id === "real") return t("adminSettings.houseSet.real");
  if (id === "stubs") return t("adminSettings.houseSet.stubs");
  return t("adminSettings.houseSet.all");
}

export function AdminHouseAnomaliesPanel() {
  const { t } = useLocale();
  const { houseSet, setHouseSet } = useHouseSet();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [data, setData] = useState<AnomaliesResponse | null>(null);
  const [filter, setFilter] = useState<"all" | "warning">("all");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/anomalies?houseSet=${encodeURIComponent(houseSet)}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as AnomaliesResponse & { error?: string };
      if (!res.ok) {
        setError(json?.error ?? t("adminSettings.anomalies.loadFailed"));
        return;
      }
      setData(json);
    } catch {
      setError(t("adminSettings.anomalies.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [houseSet, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => {
    const list = data?.items ?? [];
    if (filter === "warning") return list.filter((item) => item.severity === "warning");
    return list;
  }, [data?.items, filter]);

  async function review(
    houseId: string,
    kind: HouseAnomalyKind,
    status: "fixed" | "not_an_issue",
  ) {
    const key = `${houseId}:${kind}`;
    setActing(key);
    setError("");
    try {
      const res = await fetch("/api/admin/anomalies/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ houseId, kind, status }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string };
      if (!res.ok) {
        setError(json?.error ?? t("adminSettings.anomalies.updateFailed"));
        return;
      }
      await load();
    } catch {
      setError(t("adminSettings.anomalies.updateFailed"));
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-violet-300">
            {loading
              ? t("adminSettings.anomalies.scanning")
              : formatMessage(t("adminSettings.anomalies.summary"), {
                  open: String(items.length),
                  houses: String(data?.houseCount ?? 0),
                })}
          </p>
          {data?.eventOpenHours ? (
            <p className="text-xs text-violet-500">
              {formatMessage(t("adminSettings.anomalies.eventWindow"), {
                from: data.eventOpenHours.openFrom,
                to: data.eventOpenHours.openTo,
              })}
            </p>
          ) : null}
        </div>
        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          {t("adminSettings.anomalies.refresh")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {HOUSE_SETS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setHouseSet(id)}
            className={cn(
              "rounded-md px-2 py-1 text-sm",
              houseSet === id ? "bg-orange-500/20 text-orange-100" : "text-violet-400",
            )}
          >
            {houseSetLabel(t, id)}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-md px-2 py-1 text-sm",
            filter === "all" ? "bg-orange-500/20 text-orange-100" : "text-violet-400",
          )}
        >
          {t("adminSettings.anomalies.all")}
        </button>
        <button
          type="button"
          onClick={() => setFilter("warning")}
          className={cn(
            "rounded-md px-2 py-1 text-sm",
            filter === "warning" ? "bg-orange-500/20 text-orange-100" : "text-violet-400",
          )}
        >
          {t("adminSettings.anomalies.urgent")}
        </button>
      </div>

      {error ? <p className="text-sm text-amber-300">{error}</p> : null}

      {!loading && items.length === 0 ? (
        <p className="rounded-lg bg-[#14081c] px-3 py-4 text-sm text-violet-300 ring-1 ring-orange-500/10">
          {t("adminSettings.anomalies.noneOpen")}
        </p>
      ) : null}

      <ul className="space-y-2">
        {items.map((item) => {
          const key = itemKey(item);
          const busy = acting === key;
          return (
            <li
              key={key}
              className="rounded-lg bg-[#14081c] px-3 py-2.5 ring-1 ring-orange-500/15"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    item.severity === "warning" ? "text-amber-400" : "text-violet-400",
                  )}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium text-orange-50">{item.messageHe}</p>
                  <p className="text-xs text-violet-400">
                    {ANOMALY_KIND_LABELS[item.kind]} · {item.houseName || item.houseId}
                  </p>
                  {item.address ? (
                    <p className="truncate text-xs text-violet-500">{item.address}</p>
                  ) : null}
                  {item.detailHe ? (
                    <p className="text-xs text-violet-300/90">{item.detailHe}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      href={`/house/${encodeURIComponent(item.houseId)}`}
                      className="inline-flex items-center gap-1 text-xs text-orange-300 underline-offset-2 hover:underline"
                    >
                      {t("adminSettings.anomalies.viewHouse")}
                      <ExternalLink className="size-3" />
                    </Link>
                    <Link
                      href={`/edit/${encodeURIComponent(item.houseId)}`}
                      className="text-xs text-orange-300 underline-offset-2 hover:underline"
                    >
                      {t("adminSettings.anomalies.edit")}
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void review(item.houseId, item.kind, "fixed")}
                    >
                      {busy ? t("adminSettings.anomalies.busy") : t("adminSettings.anomalies.resolved")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void review(item.houseId, item.kind, "not_an_issue")}
                    >
                      {t("adminSettings.anomalies.notIssue")}
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
