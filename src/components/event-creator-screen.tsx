"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, List, Map as MapIcon, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { EventBoundaryKindBadge } from "@/components/event-boundary-kind-badge";
import { EventCreatorMapDynamic } from "@/components/event-creator-map-dynamic";
import type { EventBoundaryMapFeature } from "@/components/event-creator-map-types";
import type { BoundarySearchHit } from "@/lib/event-boundary";
import { addEventBoundaryZone, removeEventBoundaryZone } from "@/lib/event-boundary-selection";
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

function hitToZone(hit: BoundarySearchHit): EventBoundaryZone {
  return {
    kind: hit.kind,
    id: hit.id,
    label: hit.label,
    city: hit.city,
  };
}

function ViewToggle({
  view,
  onViewChange,
  zoneCount,
}: {
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
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{zoneCount}</span>
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
  large = false,
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
  large?: boolean;
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
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-white/40",
            large ? "right-3.5 size-5" : "right-3 size-4",
          )}
          aria-hidden
        />
        <input
          type="search"
          autoComplete="off"
          className={cn(
            "relative w-full touch-manipulation rounded-xl border border-white/15 bg-black/60 backdrop-blur-md placeholder:text-white/35",
            large ? "py-3.5 pl-3 pr-10 text-lg" : "py-3 pl-3 pr-9 text-base",
          )}
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
            <p className={cn("px-3 py-3 text-white/50", large ? "text-base" : "text-sm")}>מחפש…</p>
          ) : listError ? (
            <p className={cn("px-3 py-3 text-red-300", large ? "text-base" : "text-sm")}>{listError}</p>
          ) : hits.length === 0 ? (
            <p className={cn("px-3 py-3 text-white/45", large ? "text-base" : "text-sm")}>
              אין תוצאות — הוסיפו שם עיר לצמצום
            </p>
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
                        "flex w-full items-center gap-2 px-3 text-right transition",
                        large ? "py-3" : "py-2.5",
                        taken ? "opacity-40" : "hover:bg-white/5",
                      )}
                    >
                      <EventBoundaryKindBadge kind={hit.kind} size={large ? "lg" : "sm"} />
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-white/90", large ? "text-lg" : "text-sm")}>
                          {hit.label}
                        </p>
                        {hit.subtitle && hit.kind !== "city" ? (
                          <p className={cn("truncate text-white/45", large ? "text-base" : "text-xs")}>
                            {hit.subtitle}
                          </p>
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
  const [mapFocusId, setMapFocusId] = useState<string | null>(null);

  const persist = useCallback((next: CustomEventDraft) => {
    setDraft(next);
    saveCustomEventDraft(next);
  }, []);

  const selectedIds = useMemo(() => draft.zones.map((z) => z.id), [draft.zones]);

  const mapFocusZone = useMemo(
    () => draft.zones.find((z) => z.id === mapFocusId) ?? null,
    [draft.zones, mapFocusId],
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
    [draft, persist, resetSearch, selectedIds],
  );

  const removeZone = useCallback(
    (id: string) => {
      persist({ ...draft, zones: removeEventBoundaryZone(draft.zones, id) });
      setMapFocusId((cur) => (cur === id ? null : cur));
    },
    [draft, persist],
  );

  const clearAllZones = useCallback(() => {
    persist({ ...draft, zones: [] });
    setMapFocusId(null);
  }, [draft, persist]);

  const onMapAreaClick = useCallback((id: string) => {
    setMapFocusId((cur) => (cur === id ? null : id));
  }, []);

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
    if (draft.zones.length === 0) {
      setMapFeatures([]);
      setMapFocusId(null);
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

  const canContinue = draft.zones.length > 0;
  const footerPad = "calc(3.75rem + env(safe-area-inset-bottom, 0px))";

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-[#0c0610]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ paddingBottom: footerPad }}>
        <header className="relative z-20 shrink-0 space-y-2 border-b border-white/8 bg-[#0c0610]/95 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md">
          <p className="font-display text-lg text-orange-200">
            {view === "map" ? "איפה האירוע?" : "אזורים באירוע"}
          </p>
          <ViewToggle view={view} onViewChange={setView} zoneCount={draft.zones.length} />
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
            large={view === "list"}
          />
        </header>

        {view === "map" ? (
          <div className="relative min-h-0 flex-1">
            <EventCreatorMapDynamic
              className="absolute inset-0"
              features={mapFeatures}
              selectedIds={selectedIds}
              focusedId={mapFocusId}
              onAreaClick={onMapAreaClick}
            />
            {loadingMap ? (
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white/70">
                מעדכן מפה…
              </div>
            ) : null}
            {mapFocusZone ? (
              <div className="absolute inset-x-3 bottom-3 z-[400] flex items-center gap-2 rounded-xl border border-amber-400/35 bg-[#140a1c]/96 p-3 shadow-lg backdrop-blur-md">
                <EventBoundaryKindBadge kind={mapFocusZone.kind} size="lg" />
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate text-base font-medium text-white">{mapFocusZone.label}</p>
                  {mapFocusZone.city && mapFocusZone.kind !== "city" ? (
                    <p className="truncate text-sm text-white/50">{mapFocusZone.city}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeZone(mapFocusZone.id)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-950/70 text-red-100 hover:bg-red-900/80"
                  aria-label={`הסר ${mapFocusZone.label}`}
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setMapFocusId(null)}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white/50 hover:bg-white/10"
                  aria-label="סגור"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2">
            {draft.zones.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 py-16 text-center text-lg text-white/45">
                חפשו למעלה והוסיפו אזור — או עברו למפה
              </div>
            ) : (
              <ul className="space-y-3">
                {draft.zones.map((z) => (
                  <li
                    key={z.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3.5"
                  >
                    <EventBoundaryKindBadge kind={z.kind} size="lg" />
                    <div className="min-w-0 flex-1 text-right">
                      <p className="truncate text-lg text-white/90">{z.label}</p>
                      {z.city && z.kind !== "city" ? (
                        <p className="truncate text-base text-white/45">{z.city}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeZone(z.id)}
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white/55 hover:bg-white/10 hover:text-white"
                      aria-label={`הסר ${z.label}`}
                    >
                      <Trash2 className="size-5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-[500] flex gap-2 border-t border-white/10 bg-[#140a1c]/98 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg">
        <button
          type="button"
          disabled={draft.zones.length === 0}
          onClick={clearAllZones}
          className={cn(
            "flex flex-1 items-center justify-center rounded-xl border py-3 text-sm font-semibold transition",
            draft.zones.length > 0
              ? "border-red-400/40 bg-red-950/35 text-red-100 hover:bg-red-950/55"
              : "cursor-not-allowed border-white/10 text-white/30",
          )}
        >
          נקה הכל
        </button>
        <button
          type="button"
          disabled={!canContinue}
          className={cn(
            "flex flex-[1.35] items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition",
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
