"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, MapPin, Search, X } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EventCreatorMapDynamic } from "@/components/event-creator-map-dynamic";
import type { EventBoundaryMapFeature } from "@/components/event-creator-map-types";
import type { BoundarySearchHit } from "@/lib/event-boundary";
import {
  emptyCustomEventDraft,
  loadCustomEventDraft,
  saveCustomEventDraft,
  type CustomEventDraft,
} from "@/lib/custom-event-draft";
import {
  toggleZone,
  type EventBoundaryKind,
  type EventBoundaryZone,
} from "@/lib/event-boundary";
import { cn } from "@/lib/utils";

const DEFAULT_CITY = "רמת גן";
const MAP_ZONE_CAP = 80;

const KIND_LABELS: Record<EventBoundaryKind, string> = {
  city: "עיר",
  neighborhood: "שכונה",
  street: "רחוב",
};

const KIND_PILL: Record<EventBoundaryKind, string> = {
  city: "bg-sky-500/25 text-sky-100",
  neighborhood: "bg-emerald-500/25 text-emerald-100",
  street: "bg-orange-500/25 text-orange-100",
};

function hitToZone(hit: BoundarySearchHit): EventBoundaryZone {
  return {
    kind: hit.kind,
    id: hit.id,
    label: hit.label,
    city: hit.city,
  };
}

export function EventCreatorScreen() {
  const [draft, setDraft] = useState<CustomEventDraft>(() => loadCustomEventDraft() ?? emptyCustomEventDraft());
  const [kind, setKind] = useState<EventBoundaryKind>("neighborhood");
  const [city, setCity] = useState(DEFAULT_CITY);
  const [cityEditOpen, setCityEditOpen] = useState(false);
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

  const selectedIds = useMemo(() => draft.zones.map((z) => z.id), [draft.zones]);

  const zonesForMap = useMemo(() => {
    const selected = draft.zones;
    const taken = new Set(selected.map((z) => z.id));
    const room = Math.max(0, MAP_ZONE_CAP - selected.length);
    const previews = hits.filter((h) => !taken.has(h.id)).slice(0, room).map(hitToZone);
    return [...selected, ...previews];
  }, [draft.zones, hits]);

  const previewIds = useMemo(
    () => zonesForMap.filter((z) => !selectedIds.includes(z.id)).map((z) => z.id),
    [zonesForMap, selectedIds],
  );

  const zoneById = useMemo(() => {
    const map = new Map<string, EventBoundaryZone>();
    for (const z of draft.zones) map.set(z.id, z);
    for (const h of hits) map.set(h.id, hitToZone(h));
    return map;
  }, [draft.zones, hits]);

  const toggleById = useCallback(
    (id: string) => {
      const zone = zoneById.get(id);
      if (!zone) return;
      persist({ ...draft, zones: toggleZone(draft.zones, zone) });
    },
    [draft, persist, zoneById],
  );

  const removeZone = useCallback(
    (id: string) => {
      persist({ ...draft, zones: draft.zones.filter((z) => z.id !== id) });
    },
    [draft, persist],
  );

  const clearAllZones = useCallback(() => {
    persist({ ...draft, zones: [] });
  }, [draft, persist]);

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    setListError(null);
    const params = new URLSearchParams({ kind, limit: "120" });
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
    if (zonesForMap.length === 0) {
      setMapFeatures([]);
      return;
    }
    let cancelled = false;
    setLoadingMap(true);
    fetch("/api/event-boundaries/geometry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zones: zonesForMap }),
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
  }, [zonesForMap]);

  const searchPlaceholder =
    kind === "street" ? "שם רחוב…" : kind === "city" ? "חיפוש עיר…" : "שם שכונה…";

  const canContinue = draft.zones.length > 0;

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden bg-[#0c0610]">
      <AppHeader />
      <div className="relative min-h-0 flex-1">
        <EventCreatorMapDynamic
          className="absolute inset-0 z-0"
          features={mapFeatures}
          selectedIds={selectedIds}
          previewIds={previewIds}
          onFeatureClick={toggleById}
        />

        {loadingMap ? (
          <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-full bg-black/60 px-3 py-1 text-xs text-white/70">
            מעדכן מפה…
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-col gap-2 p-3">
          <div className="pointer-events-auto space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/"
                className="rounded-lg bg-black/55 px-2.5 py-1.5 text-sm text-white/85 backdrop-blur-sm hover:bg-black/70"
              >
                ← חזרה
              </Link>
              <p className="text-sm font-medium text-white/90">אירוע חדש · שלב 1</p>
            </div>

            <div className="flex rounded-xl border border-white/15 bg-black/55 p-1 backdrop-blur-md">
              {(["neighborhood", "city", "street"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setKind(k);
                    setQuery("");
                  }}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-sm font-medium transition",
                    kind === k ? "bg-orange-600 text-white shadow-sm" : "text-white/75 hover:bg-white/5",
                  )}
                >
                  {KIND_LABELS[k]}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {kind !== "city" ? (
                cityEditOpen ? (
                  <input
                    type="text"
                    autoFocus
                    className="w-[7.5rem] shrink-0 rounded-xl border border-white/20 bg-black/60 px-2.5 py-2.5 text-sm backdrop-blur-md"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onBlur={() => setCityEditOpen(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setCityEditOpen(false);
                    }}
                    aria-label="עיר להקשר"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setCityEditOpen(true)}
                    className="flex shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-black/55 px-2.5 py-2.5 text-sm text-white/85 backdrop-blur-md"
                  >
                    <MapPin className="size-3.5 opacity-70" aria-hidden />
                    {city || "עיר"}
                  </button>
                )
              ) : null}
              <label className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/40"
                  aria-hidden
                />
                <input
                  type="search"
                  className="w-full rounded-xl border border-white/15 bg-black/55 py-2.5 pl-3 pr-9 text-sm backdrop-blur-md placeholder:text-white/35"
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>

            {dataMissing && kind === "neighborhood" ? (
              <p className="rounded-lg border border-amber-500/35 bg-amber-950/80 px-3 py-2 text-xs text-amber-100/95 leading-relaxed">
                שכבת שכונות לא זמינה — הוסף <code className="text-[11px]">public/data/geojson</code>.
                עיר ורחוב עדיין דרך OSM.
              </p>
            ) : null}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] max-h-[min(52vh,420px)]">
          <div className="pointer-events-auto flex max-h-[inherit] flex-col rounded-t-2xl border border-b-0 border-white/12 bg-[#140a1c]/96 shadow-[0_-8px_40px_rgba(0,0,0,0.45)] backdrop-blur-lg">
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20" aria-hidden />

            <div className="shrink-0 space-y-3 px-4 pb-2 pt-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-lg text-orange-200">איפה האירוע?</h1>
                  <p className="mt-0.5 text-xs text-white/55 leading-relaxed">
                    בחרו אזור אחד או יותר — מהרשימה או בלחיצה על המפה.
                  </p>
                </div>
                {draft.zones.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearAllZones}
                    className="shrink-0 text-xs text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
                  >
                    נקה הכל
                  </button>
                ) : null}
              </div>

              <input
                type="text"
                className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm placeholder:text-white/30"
                placeholder="שם האירוע (אופציונלי)"
                value={draft.title}
                onChange={(e) => persist({ ...draft, title: e.target.value })}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
              {draft.zones.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 py-6 text-center text-sm text-white/45">
                  {loadingList ? "טוען אפשרויות…" : "עדיין לא נבחר אזור"}
                </div>
              ) : (
                <ul className="space-y-2">
                  {draft.zones.map((z) => (
                    <li
                      key={z.id}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5"
                    >
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium",
                          KIND_PILL[z.kind],
                        )}
                      >
                        {KIND_LABELS[z.kind]}
                      </span>
                      <div className="min-w-0 flex-1 text-right">
                        <p className="truncate text-sm text-white/90">{z.label}</p>
                        {z.city && z.kind !== "city" ? (
                          <p className="truncate text-xs text-white/45">{z.city}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeZone(z.id)}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white"
                        aria-label={`הסר ${z.label}`}
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {hits.length > 0 && draft.zones.length < 12 ? (
                <div className="mt-3 border-t border-white/8 pt-3">
                  <p className="mb-2 text-xs text-white/45">
                    {listError ? listError : `${hits.length} תוצאות · לחצו להוספה`}
                  </p>
                  <ul className="max-h-36 space-y-1 overflow-y-auto">
                    {hits.slice(0, 40).map((hit) => {
                      const on = selectedIds.includes(hit.id);
                      if (on) return null;
                      return (
                        <li key={hit.id}>
                          <button
                            type="button"
                            onClick={() => toggleById(hit.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-right text-sm text-white/80 hover:bg-white/5"
                          >
                            <span className="truncate">{hit.label}</span>
                            {hit.subtitle ? (
                              <span className="shrink-0 text-xs text-white/40">{hit.subtitle}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-white/10 p-4 pt-3">
              <button
                type="button"
                disabled={!canContinue}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition",
                  canContinue
                    ? "bg-orange-600 text-white hover:bg-orange-500"
                    : "cursor-not-allowed bg-white/10 text-white/35",
                )}
                onClick={() => {
                  if (!canContinue) return;
                  saveCustomEventDraft(draft);
                }}
              >
                המשך
                <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
              </button>
              <p className="mt-2 text-center text-[11px] text-white/35">
                הטיוטה נשמרת אוטומטית במכשיר · השלב הבא בקרוב
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
