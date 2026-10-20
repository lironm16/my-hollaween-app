"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { EventCreatorMapDynamic } from "@/components/event-creator-map-dynamic";
import type { EventBoundaryMapFeature } from "@/components/event-creator-map-types";
import type { BoundarySearchHit } from "@/lib/event-boundary";
import {
  clearCustomEventDraft,
  emptyCustomEventDraft,
  loadCustomEventDraft,
  saveCustomEventDraft,
  type CustomEventDraft,
} from "@/lib/custom-event-draft";
import { toggleZone, type EventBoundaryKind, type EventBoundaryZone } from "@/lib/event-boundary";
import { cn } from "@/lib/utils";

const DEFAULT_CITY = "רמת גן";

/** UI labels — `city` = whole municipality (עיר/יישוב), not Gov field name "ישוב". */
const KIND_LABELS: Record<EventBoundaryKind, string> = {
  city: "עיר (city)",
  neighborhood: "שכונה",
  street: "רחוב",
};

export function EventCreatorScreen() {
  const [draft, setDraft] = useState<CustomEventDraft>(() => loadCustomEventDraft() ?? emptyCustomEventDraft());
  const [kind, setKind] = useState<EventBoundaryKind>("neighborhood");
  const [city, setCity] = useState(DEFAULT_CITY);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<BoundarySearchHit[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [mapFeatures, setMapFeatures] = useState<EventBoundaryMapFeature[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [dataMissing, setDataMissing] = useState(false);

  const persist = useCallback((next: CustomEventDraft) => {
    setDraft(next);
    saveCustomEventDraft(next);
  }, []);

  const selectedSet = useMemo(() => new Set(draft.zones.map((z) => z.id)), [draft.zones]);

  const addHit = (hit: BoundarySearchHit) => {
    const zone: EventBoundaryZone = {
      kind: hit.kind,
      id: hit.id,
      label: hit.label,
      city: hit.city,
    };
    persist({ ...draft, zones: toggleZone(draft.zones, zone) });
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    setListError(null);
    const params = new URLSearchParams({ kind, limit: "100" });
    if (city.trim() && kind !== "city") params.set("city", city);
    if (query.trim()) params.set("q", query.trim());
    fetch(`/api/event-boundaries/search?${params}`)
      .then(async (res) => {
        const body = (await res.json()) as {
          ok?: boolean;
          error?: string;
          message?: string;
          hits?: BoundarySearchHit[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setDataMissing(body.error === "missing_data" && kind !== "street");
          setListError(body.message ?? body.error ?? "load_failed");
          setHits([]);
          return;
        }
        setDataMissing(false);
        setHits(body.hits ?? []);
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
  }, [kind, city, query]);

  useEffect(() => {
    if (draft.zones.length === 0) {
      setMapFeatures([]);
      return;
    }
    let cancelled = false;
    setLoadingMap(true);
    fetch("/api/event-boundaries/geometry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zones: draft.zones }),
    })
      .then(async (res) => {
        const body = (await res.json()) as {
          ok?: boolean;
          features?: EventBoundaryMapFeature[];
        };
        if (cancelled) return;
        setMapFeatures(body.features ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoadingMap(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.zones]);

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
              בחר גבולות לפי <strong className="font-normal text-white/90">עיר</strong> (גבול עיר/יישוב
              שלם), <strong className="font-normal text-white/90">שכונה</strong> (GovMap) או{" "}
              <strong className="font-normal text-white/90">רחוב</strong> (OSM) — נשרטט את המסגרת על
              המפה.
            </p>
          </div>

          {dataMissing ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-950/40 p-3 text-sm text-amber-100/95 leading-relaxed">
              <p className="font-medium text-amber-200">חסר קובץ שכבת השכונות</p>
              <p className="mt-1">
                עיר ורחוב עדיין עובדים דרך OSM. לשכונות GovMap:{" "}
                <code className="text-xs">public/data/geojson</code> (or .gz) +{" "}
                <code className="text-xs">npm run gov-neighborhoods:index</code>.
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

          <div className="flex rounded-lg border border-white/15 p-1">
            {(["neighborhood", "city", "street"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setQuery("");
                }}
                className={cn(
                  "flex-1 rounded-md py-2 text-sm transition",
                  kind === k ? "bg-orange-600/90 text-white" : "text-white/70 hover:bg-white/5",
                )}
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {kind !== "city" ? (
              <label className="block space-y-1">
                <span className="text-sm text-white/80">עיר (הקשר לחיפוש)</span>
                <input
                  type="text"
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </label>
            ) : (
              <div className="col-span-2 text-xs text-white/50 leading-relaxed">
                חיפוש עיר או יישוב — רשימה מתוך GovMap (כל הערים שמופיעות בשכבת השכונות).
              </div>
            )}
            <label className={cn("block space-y-1", kind === "city" && "col-span-2")}>
              <span className="text-sm text-white/80">חיפוש</span>
              <input
                type="search"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
                placeholder={
                  kind === "street" ? "שם רחוב…" : kind === "city" ? "רמת גן…" : "הגפן…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-2">
            <p className="px-2 pb-2 text-xs text-white/55">
              {loadingList ? "טוען…" : `${hits.length} תוצאות · ${draft.zones.length} גבולות נבחרו`}
            </p>
            {listError ? <p className="px-2 pb-2 text-sm text-red-300">{listError}</p> : null}
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {hits.map((hit) => {
                const on = selectedSet.has(hit.id);
                return (
                  <li key={hit.id}>
                    <button
                      type="button"
                      onClick={() => addHit(hit)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-right text-sm transition",
                        on ? "bg-emerald-900/50 text-emerald-100" : "hover:bg-white/5 text-white/85",
                      )}
                    >
                      <span className="truncate">
                        {KIND_LABELS[hit.kind]} · {hit.label}
                      </span>
                      {hit.subtitle ? (
                        <span className="shrink-0 text-xs text-white/45">{hit.subtitle}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {draft.zones.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {draft.zones.map((z) => (
                <li
                  key={z.id}
                  className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs text-white/80"
                >
                  {KIND_LABELS[z.kind]}: {z.label}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm text-white/75">
              {loadingMap ? "משרטט גבולות…" : "תצוגה מקדימה על המפה"}
            </p>
            <EventCreatorMapDynamic
              features={mapFeatures}
              selectedIds={draft.zones.map((z) => z.id)}
            />
            <p className="text-xs text-white/45 leading-relaxed">
              שכונות: GovMap · עיר/רחוב: OpenStreetMap (Nominatim) · רחוב = מסדרון ~70 מ׳ סביב
              ציר הרחוב.
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
