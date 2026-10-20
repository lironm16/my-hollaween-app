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

function ViewToggle({ view, onViewChange, zoneCount }: {
  view: CreatorView;
  onViewChange: (v: CreatorView) => void;
  zoneCount: number;
}) {
  return (
    <div className="flex rounded-xl border border-white/12 bg-black/40 p-1">
      <button
        type="button"
        onClick={() => onViewChange("map")}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition",
          view === "map" ? "bg-orange-600 text-white" : "text-white/65 hover:bg-white/5",
        )}
      >
        <MapIcon className="size-4" aria-hidden />
        מפה
      </button>
      <button
        type="button"
        onClick={() => onViewChange("list")}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition",
          view === "list" ? "bg-orange-600 text-white" : "text-white/65 hover:bg-white/5",
        )}
      >
        <List className="size-4" aria-hidden />
        רשימה
        {zoneCount > 0 ? (
          <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{zoneCount}</span>
        ) : null}
      </button>
    </div>
  );
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
    <div ref={wrapRef} className="relative z-10">
      <label className="relative block">
        <Search
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/40"
          aria-hidden
        />
        <input
          type="search"
          autoComplete="off"
          className="relative w-full touch-manipulation rounded-xl border border-white/15 bg-black/60 py-3 pl-3 pr-9 text-base backdrop-blur-md placeholder:text-white/35"
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
            "overflow-y-auto rounded-xl border border-white/15 bg-[#140a1c]/98 shadow-xl backdrop-blur-lg",
            listMode
              ? "relative z-20 mt-2 max-h-[36vh]"
              : "absolute inset-x-0 top-[calc(100%+6px)] z-[1200] max-h-[min(40vh,280px)]",
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

function clearSearchState(setters: {
  setQuery: (q: string) => void;
  setDebouncedQ: (q: string) => void;
  setHits: (h: BoundarySearchHit[]) => void;
  setSuggestOpen: (o: boolean) => void;
}) {
  setters.setQuery("");
  setters.setDebouncedQ("");
  setters.setHits([]);
  setters.setSuggestOpen(false);
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
  const searchActive = query.trim().length > 0 || debouncedQ.trim().length > 0;

  const zonesById = useMemo(() => {
    const index = new globalThis.Map<string, EventBoundaryZone>();
    for (const z of draft.zones) index.set(z.id, z);
    for (const h of hits) index.set(h.id, hitToZone(h));
    return index;
  }, [draft.zones, hits]);

  const zonesForMap = useMemo(() => {
    const selected = draft.zones;
    if (!searchActive) return selected;

    const taken = new Set(selected.map((z) => z.id));
    const room = Math.max(0, MAP_ZONE_CAP - selected.length);
    const previews = hits.filter((h) => !taken.has(h.id)).slice(0, room).map(hitToZone);
    return [...selected, ...previews];
  }, [draft.zones, hits, searchActive]);

  const previewIds = useMemo(
    () => zonesForMap.filter((z) => !selectedIds.includes(z.id)).map((z) => z.id),
    [zonesForMap, selectedIds],
  );

  const resetSearch = useCallback(() => {
    clearSearchState({ setQuery, setDebouncedQ, setHits, setSuggestOpen });
  }, []);

  const pickHit = useCallback(
    (hit: BoundarySearchHit) => {
      if (selectedIds.includes(hit.id)) return;
      persist({ ...draft, zones: addEventBoundaryZone(draft.zones, hitToZone(hit)) });
      resetSearch();
      toast.success(`נוסף: ${hit.label}`);
    },
    [draft, persist, selectedIds, resetSearch],
  );

  const addFromMap = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) return;
      const zone = zonesById.get(id);
      if (!zone) return;
      persist({ ...draft, zones: addEventBoundaryZone(draft.zones, zone) });
      resetSearch();
      toast.success(`נוסף: ${zone.label}`);
    },
    [draft, persist, selectedIds, zonesById, resetSearch],
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

  const searchBlock = (
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
      listMode={view === "list"}
    />
  );

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-[#0c0610]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
        <header className="relative z-20 shrink-0 space-y-2 border-b border-white/8 bg-[#0c0610]/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-lg text-orange-200">
              {view === "map" ? "איפה האירוע?" : "אזורים באירוע"}
            </p>
            {view === "list" && draft.zones.length > 0 ? (
              <button
                type="button"
                onClick={clearAllZones}
                className="shrink-0 text-xs text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
              >
                נקה הכל
              </button>
            ) : draft.zones.length > 0 ? (
              <span className="rounded-full bg-black/55 px-3 py-1 text-xs text-white/75">
                {draft.zones.length} באירוע
              </span>
            ) : null}
          </div>
          <ViewToggle view={view} onViewChange={setView} zoneCount={draft.zones.length} />
          {searchBlock}
          {view === "map" && searchActive ? (
            <p className="text-center text-[11px] text-white/40">
              סגול = תוצאות חיפוש · ירוק = באירוע · לחיצה על סגול מוסיפה
            </p>
          ) : null}
        </header>

        {view === "map" ? (
          <div className="relative min-h-0 flex-1">
            <EventCreatorMapDynamic
              className="absolute inset-0"
              features={mapFeatures}
              selectedIds={selectedIds}
              previewIds={previewIds}
              onPreviewClick={addFromMap}
              onSelectedClick={onSelectedMapTap}
            />
            {loadingMap ? (
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white/70">
                מעדכן מפה…
              </div>
            ) : null}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
            {draft.zones.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 py-16 text-center text-sm text-white/45">
                חפשו למעלה והוסיפו אזור — או עברו למפה
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
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-[500] border-t border-white/10 bg-[#140a1c]/98 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg">
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
