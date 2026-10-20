"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, Search, X } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EventBoundaryKindBadge } from "@/components/event-boundary-kind-badge";
import { EventCreatorMapDynamic } from "@/components/event-creator-map-dynamic";
import type { EventBoundaryMapFeature } from "@/components/event-creator-map-types";
import type { BoundarySearchHit } from "@/lib/event-boundary";
import {
  addEventBoundaryZone,
  removeEventBoundaryZone,
  toggleEventBoundaryZone,
} from "@/lib/event-boundary-selection";
import {
  emptyCustomEventDraft,
  loadCustomEventDraft,
  saveCustomEventDraft,
  type CustomEventDraft,
} from "@/lib/custom-event-draft";
import type { EventBoundaryZone } from "@/lib/event-boundary";
import { cn } from "@/lib/utils";

const SHEET_MIN_PX = 108;
const SHEET_DEFAULT_PX = 280;
const SEARCH_DEBOUNCE_MS = 280;

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
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [hits, setHits] = useState<BoundarySearchHit[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [mapFeatures, setMapFeatures] = useState<EventBoundaryMapFeature[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(SHEET_DEFAULT_PX);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const persist = useCallback((next: CustomEventDraft) => {
    setDraft(next);
    saveCustomEventDraft(next);
  }, []);

  const selectedIds = useMemo(() => draft.zones.map((z) => z.id), [draft.zones]);
  const sheetCollapsed = sheetHeight <= SHEET_MIN_PX + 8;

  const snapSheet = useCallback((h: number) => {
    const mid = (SHEET_MIN_PX + SHEET_DEFAULT_PX) / 2;
    setSheetHeight(h < mid ? SHEET_MIN_PX : SHEET_DEFAULT_PX);
  }, []);

  const onSheetPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startY: e.clientY, startH: sheetHeight };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onSheetPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const delta = dragRef.current.startY - e.clientY;
    const next = Math.min(
      Math.max(SHEET_MIN_PX, dragRef.current.startH + delta),
      Math.min(typeof window !== "undefined" ? window.innerHeight * 0.55 : 420, 420),
    );
    setSheetHeight(next);
  };

  const onSheetPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    snapSheet(sheetHeight);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const pickHit = useCallback(
    (hit: BoundarySearchHit) => {
      const zone = hitToZone(hit);
      persist({ ...draft, zones: addEventBoundaryZone(draft.zones, zone) });
      setQuery("");
      setDebouncedQ("");
      setHits([]);
      setSuggestOpen(false);
    },
    [draft, persist],
  );

  const removeZone = useCallback(
    (id: string) => {
      persist({ ...draft, zones: removeEventBoundaryZone(draft.zones, id) });
    },
    [draft, persist],
  );

  const toggleById = useCallback(
    (id: string) => {
      const zone = draft.zones.find((z) => z.id === id);
      if (!zone) return;
      persist({ ...draft, zones: toggleEventBoundaryZone(draft.zones, zone) });
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

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const showSuggest = suggestOpen && query.trim().length > 0;
  const canContinue = draft.zones.length > 0;

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden bg-[#0c0610]">
      <AppHeader />
      <div className="relative min-h-0 flex-1">
        <EventCreatorMapDynamic
          className="absolute inset-0 z-0"
          features={mapFeatures}
          selectedIds={selectedIds}
          previewIds={[]}
          onFeatureClick={toggleById}
        />

        {loadingMap ? (
          <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-full bg-black/60 px-3 py-1 text-xs text-white/70">
            מעדכן מפה…
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-3">
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

            <div ref={searchWrapRef} className="relative">
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/40"
                  aria-hidden
                />
                <input
                  type="search"
                  autoComplete="off"
                  className="w-full rounded-xl border border-white/15 bg-black/60 py-3 pl-3 pr-9 text-sm backdrop-blur-md placeholder:text-white/35"
                  placeholder="שכונה, רחוב או יישוב…"
                  value={query}
                  onFocus={() => setSuggestOpen(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSuggestOpen(true);
                  }}
                />
              </label>

              {showSuggest ? (
                <div className="absolute inset-x-0 top-[calc(100%+6px)] max-h-[min(42vh,320px)] overflow-y-auto rounded-xl border border-white/15 bg-[#140a1c]/98 shadow-xl backdrop-blur-lg">
                  {loadingList ? (
                    <p className="px-3 py-3 text-sm text-white/50">מחפש…</p>
                  ) : listError ? (
                    <p className="px-3 py-3 text-sm text-red-300">{listError}</p>
                  ) : hits.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-white/45">אין תוצאות — הוסיפו שם יישוב לצמצום</p>
                  ) : (
                    <ul className="py-1">
                      {hits.map((hit) => {
                        const taken = selectedIds.includes(hit.id);
                        return (
                          <li key={hit.id}>
                            <button
                              type="button"
                              disabled={taken}
                              onClick={() => pickHit(hit)}
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
                  <p className="border-t border-white/8 px-3 py-2 text-[11px] text-white/35">
                    יישוב / מושב / עיר — אותה תווית «יישוב» · הקלידו שם יישוב לצמצום רחובות ושכונות
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[500]"
          style={{ height: sheetHeight }}
        >
          <div className="pointer-events-auto flex h-full flex-col rounded-t-2xl border border-b-0 border-white/12 bg-[#140a1c]/96 shadow-[0_-8px_40px_rgba(0,0,0,0.45)] backdrop-blur-lg">
            <div
              className="flex shrink-0 touch-none flex-col items-center pt-2"
              onPointerDown={onSheetPointerDown}
              onPointerMove={onSheetPointerMove}
              onPointerUp={onSheetPointerUp}
              onPointerCancel={onSheetPointerUp}
              role="separator"
              aria-label="גרירה להצגת המפה"
            >
              <div className="h-1 w-12 rounded-full bg-white/25" />
              <button
                type="button"
                className="mt-1 flex items-center gap-1 px-3 py-1 text-[11px] text-white/45"
                onClick={() => setSheetHeight(sheetCollapsed ? SHEET_DEFAULT_PX : SHEET_MIN_PX)}
              >
                {sheetCollapsed ? (
                  <>
                    הצג אזורים נבחרים
                    <ChevronUp className="size-3.5" aria-hidden />
                  </>
                ) : (
                  <>
                    הצג מפה מלאה
                    <ChevronDown className="size-3.5" aria-hidden />
                  </>
                )}
              </button>
            </div>

            {!sheetCollapsed ? (
              <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2">
                <div>
                  <h1 className="font-display text-lg text-orange-200">אזורים באירוע</h1>
                  <p className="text-xs text-white/50">{draft.zones.length} נבחרו · לחיצה על המפה מסירה</p>
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
            ) : (
              <p className="shrink-0 px-4 pb-1 text-center text-xs text-white/50">
                {draft.zones.length > 0 ? `${draft.zones.length} אזורים נבחרו` : "טרם נבחר אזור"}
              </p>
            )}

            {!sheetCollapsed ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
                {draft.zones.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/15 py-8 text-center text-sm text-white/45">
                    חפשו למעלה והוסיפו מהרשימה
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
            ) : null}

            <div className="mt-auto shrink-0 border-t border-white/10 p-4 pt-3">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
