"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, List, Map as MapIcon, Search, X } from "lucide-react";
import { toast } from "sonner";
import { EventBoundaryKindBadge } from "@/components/event-boundary-kind-badge";
import { EventCreatorMapDynamic } from "@/components/event-creator-map-dynamic";
import type { EventBoundaryMapFeature } from "@/components/event-creator-map-types";
import type { BoundarySearchHit } from "@/lib/event-boundary";
import {
  addEventBoundaryZone,
  removeEventBoundaryZone,
} from "@/lib/event-boundary-selection";
import {
  emptyCustomEventDraft,
  loadCustomEventDraft,
  saveCustomEventDraft,
  type CustomEventDraft,
} from "@/lib/custom-event-draft";
import type { EventBoundaryZone } from "@/lib/event-boundary";
import { cn } from "@/lib/utils";

type CreatorView = "map" | "list";

const SEARCH_DEBOUNCE_MS = 280;
const MAP_ZONE_CAP = 80;

function hitToZone(hit: BoundarySearchHit): EventBoundaryZone {
  return {
    kind: hit.kind,
    id: hit.id,
    label: hit.label,
    city: hit.city,
  };
}

function BoundarySearchField({
  query,
  onQueryChange,
  suggestOpen,
  onSuggestOpen,
  hits,
  loadingList,
  listError,
  selectedIds,
  onPick,
  listMode = false,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  suggestOpen: boolean;
  onSuggestOpen: (open: boolean) => void;
  hits: BoundarySearchHit[];
  loadingList: boolean;
  listError: string | null;
  selectedIds: string[];
  onPick: (hit: BoundarySearchHit) => void;
  listMode?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onSuggestOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onSuggestOpen]);

  const showSuggest = suggestOpen && query.trim().length > 0;

  return (
    <div ref={wrapRef} className="relative">
      <label className="relative block">
        <Search
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/40"
          aria-hidden
        />
        <input
          type="search"
          autoComplete="off"
          className="w-full rounded-xl border border-white/15 bg-black/60 py-3 pl-3 pr-9 text-sm backdrop-blur-md placeholder:text-white/35"
          placeholder="שכונה, רחוב או עיר…"
          value={query}
          onFocus={() => onSuggestOpen(true)}
          onChange={(e) => {
            onQueryChange(e.target.value);
            onSuggestOpen(true);
          }}
        />
      </label>

      {showSuggest ? (
        <div
          className={cn(
            "z-[600] overflow-y-auto rounded-xl border border-white/15 bg-[#140a1c]/98 shadow-xl backdrop-blur-lg",
            listMode
              ? "relative mt-2 max-h-[40vh]"
              : "absolute inset-x-0 top-[calc(100%+6px)] max-h-[min(50vh,360px)]",
          )}
        >
          {loadingList ? (
            <p className="px-3 py-3 text-sm text-white/50">מחפש…</p>
          ) : listError ? (
            <p className="px-3 py-3 text-sm text-red-300">{listError}</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-3 text-sm text-white/45">אין תוצאות — הוסיפו שם עיר לצמצום</p>
          ) : (
            <ul className="py-1">
              {hits.map((hit) => {
                const taken = selectedIds.includes(hit.id);
                return (
                  <li key={hit.id}>
                    <button
                      type="button"
                      disabled={taken}
                      onClick={() => onPick(hit)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2.5 text-right transition",
                        taken ? "opacity-40" : "hover:bg-white/5",
                      )}
                    >
                      <EventBoundaryKindBadge kind={hit.kind} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white/90">{hit.label}</p>
                        {hit.subtitle && hit.kind !== "city" ? (
                          <p className="truncate text-xs text-white/45">{hit.subtitle}</p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function EventCreatorScreen() {
  const [view, setView] = useState<CreatorView>("map");
  const [draft, setDraft] = useState<CustomEventDraft>(() => loadCustomEventDraft() ?? emptyCustomEventDraft());
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [hits, setHits] = useState<BoundarySearchHit[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [mapFeatures, setMapFeatures] = useState<EventBoundaryMapFeature[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);

  const persist = useCallback((next: CustomEventDraft) => {
    setDraft(next);
    saveCustomEventDraft(next);
  }, []);

  const selectedIds = useMemo(() => draft.zones.map((z) => z.id), [draft.zones]);

  const zoneById = useMemo(() => {
    const map = new Map<string, EventBoundaryZone>();
    for (const z of draft.zones) map.set(z.id, z);
    for (const h of hits) map.set(h.id, hitToZone(h));
    return map;
  }, [draft.zones, hits]);

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

  const pickHit = useCallback(
    (hit: BoundarySearchHit) => {
      if (selectedIds.includes(hit.id)) return;
      persist({ ...draft, zones: addEventBoundaryZone(draft.zones, hitToZone(hit)) });
      setSuggestOpen(false);
      toast.success(`נוסף: ${hit.label}`);
    },
    [draft, persist, selectedIds],
  );

  const addFromMap = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) return;
      const zone = zoneById.get(id);
      if (!zone) return;
      persist({ ...draft, zones: addEventBoundaryZone(draft.zones, zone) });
      toast.success(`נוסף: ${zone.label}`);
    },
    [draft, persist, selectedIds, zoneById],
  );

  const onSelectedMapTap = useCallback(
    (id: string) => {
      const zone = draft.zones.find((z) => z.id === id);
      if (!zone) return;
      toast.message(`${zone.label} כבר באירוע`, {
        description: "להסרה — עברו לרשימה",
        action: {
          label: "רשימה",
          onClick: () => setView("list"),
        },
      });
    },
    [draft.zones],
  );

  const removeZone = useCallback(
    (id: string) => {
      persist({ ...draft, zones: removeEventBoundaryZone(draft.zones, id) });
    },
    [draft, persist],
  );

  const clearAllZones = useCallback(() => {
    persist({ ...draft, zones: [] });
  }, [draft, persist]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debouncedQ) {
      setHits([]);
      setListError(null);
      return;
    }
    let cancelled = false;
    setLoadingList(true);
    setListError(null);
    fetch(`/api/event-boundaries/unified-search?q=${encodeURIComponent(debouncedQ)}`)
      .then(async (res) => {
        const body = (await res.json()) as {
          ok?: boolean;
          error?: string;
          message?: string;
          hits?: BoundarySearchHit[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setListError(body.message ?? body.error ?? "load_failed");
          setHits([]);
          return;
        }
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
  }, [debouncedQ]);

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

  const canContinue = draft.zones.length > 0;

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-[#0c0610]">
      <div className="min-h-0 flex-1 overflow-hidden pb-[calc(7.25rem+env(safe-area-inset-bottom,0px))]">
        {view === "map" ? (
          <div className="relative h-full w-full">
            <EventCreatorMapDynamic
              className="absolute inset-0"
              features={mapFeatures}
              selectedIds={selectedIds}
              previewIds={previewIds}
              onPreviewClick={addFromMap}
              onSelectedClick={onSelectedMapTap}
            />

            {loadingMap ? (
              <div className="pointer-events-none absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[400] rounded-full bg-black/60 px-3 py-1 text-xs text-white/70">
                מעדכן מפה…
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] space-y-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div className="pointer-events-auto flex items-center justify-between gap-2">
                <p className="font-display text-lg text-orange-200">איפה האירוע?</p>
                {draft.zones.length > 0 ? (
                  <span className="rounded-full bg-black/55 px-3 py-1 text-xs text-white/75 backdrop-blur-sm">
                    {draft.zones.length} באירוע
                  </span>
                ) : null}
              </div>
              <BoundarySearchField
                query={query}
                onQueryChange={setQuery}
                suggestOpen={suggestOpen}
                onSuggestOpen={setSuggestOpen}
                hits={hits}
                loadingList={loadingList}
                listError={listError}
                selectedIds={selectedIds}
                onPick={pickHit}
              />
              <p className="pointer-events-none text-center text-[11px] text-white/40">
                חיפוש מציג אזורים סגולים — לחיצה מוסיפה · ירוק = כבר נוסף
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-hidden px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="shrink-0 space-y-3 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg text-orange-200">אזורים באירוע</p>
                  <p className="text-xs text-white/50">שלב 1 · {draft.zones.length} נבחרו</p>
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
              <BoundarySearchField
                query={query}
                onQueryChange={setQuery}
                suggestOpen={suggestOpen}
                onSuggestOpen={setSuggestOpen}
                hits={hits}
                loadingList={loadingList}
                listError={listError}
                selectedIds={selectedIds}
                onPick={pickHit}
                listMode
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
              {draft.zones.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 py-16 text-center text-sm text-white/45">
                  חפשו והוסיפו אזור — או עברו למפה
                </div>
              ) : (
                <ul className="space-y-2">
                  {draft.zones.map((z) => (
                    <li
                      key={z.id}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5"
                    >
                      <EventBoundaryKindBadge kind={z.kind} />
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
            </div>
          </div>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-[500] border-t border-white/10 bg-[#140a1c]/98 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg">
        <div className="mb-3 flex rounded-xl border border-white/12 bg-black/40 p-1">
          <button
            type="button"
            onClick={() => setView("map")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition",
              view === "map" ? "bg-orange-600 text-white" : "text-white/65 hover:bg-white/5",
            )}
          >
            <MapIcon className="size-4" aria-hidden />
            מפה
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition",
              view === "list" ? "bg-orange-600 text-white" : "text-white/65 hover:bg-white/5",
            )}
          >
            <List className="size-4" aria-hidden />
            רשימה
            {draft.zones.length > 0 ? (
              <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{draft.zones.length}</span>
            ) : null}
          </button>
        </div>
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
      </footer>
    </div>
  );
}
