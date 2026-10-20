"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { EventCreatorMap } from "@/components/event-creator-map";
import {
  clearCustomEventDraft,
  emptyCustomEventDraft,
  loadCustomEventDraft,
  saveCustomEventDraft,
  type CustomEventDraft,
} from "@/lib/custom-event-draft";
import type { GovNeighborhoodCatalogEntry, GovNeighborhoodFeature } from "@/lib/gov-neighborhoods/types";
import { cn } from "@/lib/utils";

const DEFAULT_CITY = "רמת גן";

export function EventCreatorScreen() {
  const [draft, setDraft] = useState<CustomEventDraft>(() => loadCustomEventDraft() ?? emptyCustomEventDraft());
  const [city, setCity] = useState(DEFAULT_CITY);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<GovNeighborhoodCatalogEntry[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [mapFeatures, setMapFeatures] = useState<GovNeighborhoodFeature[]>([]);
  const [mapIds, setMapIds] = useState<string[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [dataMissing, setDataMissing] = useState(false);

  const persist = useCallback((next: CustomEventDraft) => {
    setDraft(next);
    saveCustomEventDraft(next);
  }, []);

  const toggleId = (id: string) => {
    persist({
      ...draft,
      neighborhoodIds: draft.neighborhoodIds.includes(id)
        ? draft.neighborhoodIds.filter((x) => x !== id)
        : [...draft.neighborhoodIds, id],
    });
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    setListError(null);
    const params = new URLSearchParams({ city, limit: "120" });
    if (query.trim()) params.set("q", query.trim());
    fetch(`/api/gov-neighborhoods?${params}`)
      .then(async (res) => {
        const body = (await res.json()) as {
          ok?: boolean;
          error?: string;
          message?: string;
          entries?: GovNeighborhoodCatalogEntry[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setDataMissing(body.error === "missing_data");
          setListError(body.message ?? body.error ?? "load_failed");
          setEntries([]);
          return;
        }
        setDataMissing(false);
        setEntries(body.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setListError("network_error");
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city, query]);

  const selectedSet = useMemo(() => new Set(draft.neighborhoodIds), [draft.neighborhoodIds]);

  useEffect(() => {
    const ids = draft.neighborhoodIds;
    if (ids.length === 0) {
      setMapFeatures([]);
      setMapIds([]);
      return;
    }
    let cancelled = false;
    setLoadingMap(true);
    fetch(`/api/gov-neighborhoods/features?ids=${encodeURIComponent(ids.join(","))}`)
      .then(async (res) => {
        const body = (await res.json()) as {
          ok?: boolean;
          features?: GovNeighborhoodFeature[];
          message?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setMapFeatures([]);
          setMapIds([]);
          if (body.message) setListError(body.message);
          return;
        }
        const features = body.features ?? [];
        setMapFeatures(features);
        setMapIds(
          features.map(
            (f) =>
              (f.properties?.id as string | undefined) ??
              String(f.properties?.UniqueId ?? f.properties?.FID ?? ""),
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingMap(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.neighborhoodIds]);

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto w-full max-w-lg space-y-4 pb-12">
          <div className="space-y-1">
            <Link href="/help" className="text-sm text-orange-300/90 hover:underline">
              ← עזרה
            </Link>
            <h1 className="font-display text-2xl text-orange-300">יצירת אירוע (טיוטה)</h1>
            <p className="text-sm text-white/70 leading-relaxed">
              בחר שכונות ממפת GovMap (שכבת שכונות). הטיוטה נשמרת במכשיר בלבד — לא מפרסמים לייצור עדיין.
            </p>
          </div>

          {dataMissing ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-950/40 p-3 text-sm text-amber-100/95 leading-relaxed">
              <p className="font-medium text-amber-200">חסר קובץ שכבת השכונות</p>
              <p className="mt-1">
                שים את <code className="text-xs">gov-neighborhoods.geojson.gz</code> בתיקייה{" "}
                <code className="text-xs">public/data/</code> והרץ{" "}
                <code className="text-xs">npm run gov-neighborhoods:index</code>. פרטים ב־{" "}
                <code className="text-xs">public/data/README.md</code>.
              </p>
            </div>
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm text-white/80">שם האירוע</span>
            <input
              type="text"
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-base"
              placeholder="לדוגמה: הלואין בשכונות רמת גן"
              value={draft.title}
              onChange={(e) => persist({ ...draft, title: e.target.value })}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-sm text-white/80">ישוב</span>
              <input
                type="text"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-white/80">חיפוש שכונה</span>
              <input
                type="search"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
                placeholder="הגפן…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-2">
            <p className="px-2 pb-2 text-xs text-white/55">
              {loadingList ? "טוען רשימה…" : `${entries.length} שכונות · ${draft.neighborhoodIds.length} נבחרו`}
            </p>
            {listError && !dataMissing ? (
              <p className="px-2 pb-2 text-sm text-red-300">{listError}</p>
            ) : null}
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {entries.map((entry) => {
                const on = selectedSet.has(entry.id);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => toggleId(entry.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-right text-sm transition",
                        on ? "bg-emerald-900/50 text-emerald-100" : "hover:bg-white/5 text-white/85",
                      )}
                    >
                      <span className="truncate">{entry.name}</span>
                      <span className="shrink-0 text-xs text-white/45">{entry.city || "—"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-white/75">
              {loadingMap ? "טוען גבולות…" : "מפת גבולות (GovMap)"}
            </p>
            <EventCreatorMap features={mapFeatures} selectedIds={draft.neighborhoodIds} idByFeatureIndex={mapIds} />
            <p className="text-xs text-white/45 leading-relaxed">
              מקור: data.gov.il / GovMap שכונות · לא Madlan · טיוטה מקומית בלבד.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-orange-600/90 px-4 py-2 text-sm font-medium text-white"
              onClick={() => saveCustomEventDraft(draft)}
            >
              שמור טיוטה
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm"
              onClick={() => {
                clearCustomEventDraft();
                setDraft(emptyCustomEventDraft());
              }}
            >
              נקה
            </button>
          </div>

          <pre className="max-h-40 overflow-auto rounded-lg bg-black/50 p-3 text-xs text-white/60">
            {JSON.stringify(draft, null, 2)}
          </pre>
        </div>
      </main>
    </div>
  );
}
