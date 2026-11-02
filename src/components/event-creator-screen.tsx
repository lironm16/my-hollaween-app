"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  existingZonesContainedInNewZone,
  geometriesFromMapFeatures,
  pruneZonesContainedInParents,
} from "@/lib/event-boundary-zone-prune";
import { fetchEventBoundaryZoneGeometry } from "@/lib/event-boundary-geometry-client";
import { ChevronRight, List, Map as MapIcon, Pointer, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { POINT_TAP_RADIUS_M } from "@/lib/event-boundary-point";
import { pointInGeoPolygon } from "@/lib/event-boundary-street-geom";
import { distanceMeters } from "@/lib/geo";
import { EventBoundaryKindBadge } from "@/components/event-boundary-kind-badge";
import { EventCreatorMapDynamic } from "@/components/event-creator-map-dynamic";
import type { EventBoundaryMapFeature } from "@/components/event-creator-map-types";
import type { BoundarySearchHit, EventBoundaryKind } from "@/lib/event-boundary";
import { queryEligibleForPointSearch, roundEventBoundaryCoord, zoneKeyPoint } from "@/lib/event-boundary";
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

const MAP_TAP_EMPTY_MESSAGE: Record<EventBoundaryKind, string> = {
  point: "לא נמצאה כתובת בנקודה זו",
  street: "לא נמצא רחוב בנקודה זו",
  neighborhood: "לא נמצאה שכונה בנקודה זו",
  city: "לא נמצאה עיר בנקודה זו",
};

const MAP_TAP_KIND_HINT: Record<EventBoundaryKind, string> = {
  point: "לחצו על המפה ליד כתובת עם מספר בית",
  street: "לחצו על המפה על הרחוב שרוצים להוסיף",
  neighborhood: "לחצו על המפה בתוך השכונה",
  city: "לחצו על המפה בתוך העיר",
};

function hitToZone(hit: BoundarySearchHit): EventBoundaryZone {
  return {
    kind: hit.kind,
    id: hit.id,
    label: hit.label,
    city: hit.city,
    ...(hit.lat != null && hit.lng != null ? { lat: hit.lat, lng: hit.lng } : {}),
  };
}

/** RTL tab order (right → left): נקודה · רחוב · שכונה · עיר */
const MAP_TAP_KINDS: { kind: EventBoundaryKind; label: string }[] = [
  { kind: "point", label: "נקודה" },
  { kind: "street", label: "רחוב" },
  { kind: "neighborhood", label: "שכונה" },
  { kind: "city", label: "עיר" },
];

function MapTapKindToggle({
  kind,
  onKindChange,
  className,
}: {
  kind: EventBoundaryKind;
  onKindChange: (k: EventBoundaryKind) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-4 gap-0.5 rounded-xl border border-white/20 bg-white/12 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        className,
      )}
      role="tablist"
      dir="rtl"
      aria-label="סוג אזור לחיפוש ולבחירה במפה"
    >
      {MAP_TAP_KINDS.map(({ kind: k, label }) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={kind === k}
          onClick={() => onKindChange(k)}
          className={cn(
            "min-h-9 rounded-[10px] px-0.5 py-2 text-center text-[11px] font-semibold leading-tight transition sm:text-xs",
            kind === k ? "bg-orange-600 text-white shadow-sm" : "text-white/70 hover:bg-white/8 hover:text-white",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function BoundarySuggestPanel({
  open,
  hits,
  loadingList,
  listError,
  selectedIds,
  onPick,
  large = false,
  boundaryKind,
  query,
}: {
  open: boolean;
  hits: BoundarySearchHit[];
  loadingList: boolean;
  listError: string | null;
  selectedIds: string[];
  onPick: (hit: BoundarySearchHit) => void;
  large?: boolean;
  boundaryKind?: EventBoundaryKind;
  query?: string;
}) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "relative z-[5] w-full overflow-y-auto rounded-xl border border-white/15 bg-[#140a1c]/98 shadow-xl backdrop-blur-lg",
        large ? "mt-2 max-h-[36vh]" : "max-h-[min(42vh,320px)]",
      )}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {loadingList ? (
        <p className={cn("px-3 py-3 text-white/50", large ? "text-base" : "text-sm")}>מחפש…</p>
      ) : listError ? (
        <p className={cn("px-3 py-3 text-red-300", large ? "text-base" : "text-sm")}>{listError}</p>
      ) : hits.length === 0 ? (
        <p className={cn("px-3 py-3 leading-relaxed text-white/45", large ? "text-base" : "text-sm")}>
          {query?.trim() && !queryEligibleForPointSearch(query) && /\d/.test(query)
            ? "לכתובת מדויקת הוסיפו מספר בית (למשל: ביאליק 12, רמת גן)"
            : query?.trim() && queryEligibleForPointSearch(query)
              ? "נסו להוסיף עיר, או בחרו נקודה במפה (למשל: נחליאלי 4, רמת גן)"
              : "אין תוצאות — הוסיפו שם עיר לצמצום"}
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
                    <p className={cn("truncate text-white/90", large ? "text-lg" : "text-sm")}>{hit.label}</p>
                    {hit.subtitle && hit.kind !== "city" ? (
                      <p className={cn("truncate text-white/45", large ? "text-base" : "text-xs")}>{hit.subtitle}</p>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EventZoneListRow({ zone, showDelete, onDelete }: { zone: EventBoundaryZone; showDelete?: boolean; onDelete?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3.5">
      <EventBoundaryKindBadge kind={zone.kind} size="lg" />
      <div className="min-w-0 flex-1 text-right">
        <p className="truncate text-lg text-white/90">{zone.label}</p>
        {zone.city && zone.kind !== "city" ? (
          <p className="truncate text-base text-white/45">{zone.city}</p>
        ) : null}
      </div>
      {showDelete && onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white/55 hover:bg-white/10 hover:text-white"
          aria-label={`הסר ${zone.label}`}
        >
          <Trash2 className="size-5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function pointCoveredBySelectedZones(
  lat: number,
  lng: number,
  features: EventBoundaryMapFeature[],
  selectedIds: string[],
): boolean {
  const selected = new Set(selectedIds);
  for (const f of features) {
    const id = f.properties?.id;
    if (!id || !selected.has(id)) continue;
    const g = f.geometry;
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) continue;
    if (pointInGeoPolygon(lng, lat, g)) return true;
  }
  return false;
}

function selectedZoneIdAtPoint(
  features: EventBoundaryMapFeature[],
  selectedIds: string[],
  lat: number,
  lng: number,
): string | null {
  const selected = new Set(selectedIds);
  let bestPoint: { id: string; dist: number } | null = null;
  for (const f of features) {
    const id = f.properties?.id;
    if (!id || !selected.has(id)) continue;
    if (f.properties?.kind === "point") {
      const plat = f.properties.pointLat;
      const plng = f.properties.pointLng;
      if (plat == null || plng == null) continue;
      const dist = distanceMeters({ lat, lng }, { lat: plat, lng: plng });
      if (dist <= POINT_TAP_RADIUS_M && (!bestPoint || dist < bestPoint.dist)) {
        bestPoint = { id, dist };
      }
      continue;
    }
    const g = f.geometry;
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) continue;
    if (pointInGeoPolygon(lng, lat, g)) return id;
  }
  return bestPoint?.id ?? null;
}

function ZoneContainmentDialog({
  open,
  newLabel,
  contained,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  newLabel: string;
  contained: EventBoundaryZone[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="z-[600] max-w-[min(100%-2rem,26rem)] border-orange-500/30 bg-[#1d1028] p-4 text-orange-50"
      >
        <div className="space-y-4 text-right">
          <p className="text-base leading-relaxed text-violet-100">
            האזור <span className="font-semibold text-orange-200">{newLabel}</span> כולל אזורים שכבר בחרתם.
            הם יוסרו אם תמשיכו:
          </p>
          <ul className="max-h-[40vh] space-y-3 overflow-y-auto">
            {contained.map((z) => (
              <li key={z.id}>
                <EventZoneListRow zone={z} />
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              className="min-h-12 min-w-0 flex-1 py-3 text-lg font-semibold bg-orange-500 text-black hover:bg-orange-400"
              onClick={onConfirm}
            >
              המשך
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-12 min-w-0 flex-1 py-3 text-lg font-semibold"
              onClick={onCancel}
            >
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MapTapModeButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "סיום לחיצה במפה" : "לחיצה במפה — הוספת אזור"}
      onClick={onToggle}
      className={cn(
        "flex h-11 max-w-[5.75rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-1 transition",
        active
          ? "border-orange-400/50 bg-orange-600 text-white shadow-sm"
          : "border-white/12 bg-black/40 text-white/90 hover:bg-white/10",
      )}
    >
      <Pointer className="size-5 shrink-0" aria-hidden />
      <span className="text-center text-[10px] font-semibold leading-tight">לחיצה במפה</span>
    </button>
  );
}

function ViewToggle({ view, onViewChange }: { view: CreatorView; onViewChange: (v: CreatorView) => void }) {
  const switchTo = view === "map" ? "list" : "map";
  const SwitchIcon = switchTo === "list" ? List : MapIcon;
  const switchLabel = switchTo === "list" ? "רשימה" : "מפה";

  return (
    <button
      type="button"
      onClick={() => onViewChange(switchTo)}
      aria-label={switchLabel}
      className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-black/40 text-white transition hover:bg-white/10"
    >
      <SwitchIcon className="size-6" aria-hidden />
    </button>
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
  placeholder,
  boundaryKind,
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
  placeholder?: string;
  boundaryKind?: EventBoundaryKind;
}) {
  return (
    <div className={cn("relative z-10 min-w-0 flex-1")}>
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
          dir="rtl"
          autoComplete="off"
          className={cn(
            "relative w-full touch-manipulation rounded-xl border border-white/15 bg-black/60 text-right backdrop-blur-md placeholder:text-right placeholder:text-white/35",
            "[&::placeholder]:[direction:rtl]",
            large ? "py-3.5 pl-3 pr-10 text-lg" : "py-3 pl-3 pr-9 text-base",
          )}
          placeholder={placeholder ?? "חפשו אזור…"}
          value={query}
          onFocus={() => onSuggestOpen(true)}
          onChange={(e) => {
            onQueryChange(e.target.value);
            onSuggestOpen(true);
          }}
        />
      </label>

      {listMode && suggestOpen && query.trim().length > 0 ? (
        <BoundarySuggestPanel
          open
          hits={hits}
          loadingList={loadingList}
          listError={listError}
          selectedIds={selectedIds}
          onPick={onPick}
          large={large}
          boundaryKind={boundaryKind}
          query={query}
        />
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
  const [boundaryKind, setBoundaryKind] = useState<EventBoundaryKind>("neighborhood");
  const [mapTapMode, setMapTapMode] = useState(false);
  const [mapPickDraft, setMapPickDraft] = useState<{
    lat: number;
    lng: number;
    loading: boolean;
    hit: BoundarySearchHit | null;
  } | null>(null);
  const mapPickDraftReqRef = useRef(0);
  const searchChromeRef = useRef<HTMLDivElement>(null);
  const [containmentPrompt, setContainmentPrompt] = useState<{
    hit: BoundarySearchHit;
    contained: EventBoundaryZone[];
  } | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const skipPruneToastRef = useRef(false);

  const persist = useCallback((next: CustomEventDraft) => {
    setDraft(next);
    saveCustomEventDraft(next);
  }, []);

  const selectedIds = useMemo(() => draft.zones.map((z) => z.id), [draft.zones]);
  const [fitZoneId, setFitZoneId] = useState<string | null>(null);
  const boundsFitKey = useMemo(() => {
    if (!fitZoneId) return "";
    const f = mapFeatures.find((x) => x.properties?.id === fitZoneId);
    if (!f?.geometry) return `${fitZoneId}:pending`;
    return `${fitZoneId}:ready`;
  }, [fitZoneId, mapFeatures]);

  const mapFocusZone = useMemo(
    () => draft.zones.find((z) => z.id === mapFocusId) ?? null,
    [draft.zones, mapFocusId],
  );

  const resetSearch = useCallback(() => {
    clearSearchState({ setQuery, setDebouncedQ, setHits, setSuggestOpen });
  }, []);

  const applyPickHit = useCallback(
    (hit: BoundarySearchHit) => {
      const current = draftRef.current;
      if (current.zones.some((z) => z.id === hit.id)) {
        setMapFocusId(hit.id);
        toast.message("כבר נבחר");
        return;
      }
      persist({ ...current, zones: addEventBoundaryZone(current.zones, hitToZone(hit)) });
      setMapFocusId(hit.id);
      setFitZoneId(hit.id);
      resetSearch();
      toast.success(`נוסף: ${hit.label}`);
    },
    [persist, resetSearch],
  );

  const attemptPickHit = useCallback(
    async (hit: BoundarySearchHit) => {
      const current = draftRef.current;
      if (current.zones.some((z) => z.id === hit.id)) {
        setMapFocusId(hit.id);
        toast.message("כבר נבחר");
        return;
      }

      if (hit.kind === "point") {
        const plat = hit.lat;
        const plng = hit.lng;
        if (
          plat != null &&
          plng != null &&
          pointCoveredBySelectedZones(plat, plng, mapFeatures, current.zones.map((z) => z.id))
        ) {
          toast.message("הנקודה כבר כלולה באזורים שבחרתם לאירוע");
          return;
        }
      }

      const newZone = hitToZone(hit);
      let geoms = geometriesFromMapFeatures(mapFeatures);
      if (geoms.size === 0 && current.zones.length > 0) {
        const res = await fetch("/api/event-boundaries/geometry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zones: current.zones }),
        });
        if (res.ok) {
          const body = (await res.json()) as { features?: EventBoundaryMapFeature[] };
          geoms = geometriesFromMapFeatures(body.features ?? []);
        }
      }
      if (geoms.size === 0) {
        applyPickHit(hit);
        return;
      }

      const newGeom = await fetchEventBoundaryZoneGeometry(newZone);
      if (!newGeom) {
        applyPickHit(hit);
        return;
      }

      const contained = existingZonesContainedInNewZone(current.zones, geoms, newZone, newGeom);
      if (contained.length === 0) {
        applyPickHit(hit);
        return;
      }

      setContainmentPrompt({ hit, contained });
    },
    [applyPickHit, mapFeatures],
  );

  const confirmContainmentPick = useCallback(() => {
    if (!containmentPrompt) return;
    skipPruneToastRef.current = true;
    applyPickHit(containmentPrompt.hit);
    setContainmentPrompt(null);
  }, [applyPickHit, containmentPrompt]);

  const loadMapPickDraft = useCallback(
    async (lat: number, lng: number, kind: EventBoundaryKind) => {
      const token = ++mapPickDraftReqRef.current;
      const rLat = roundEventBoundaryCoord(lat);
      const rLng = roundEventBoundaryCoord(lng);
      setMapPickDraft({ lat: rLat, lng: rLng, loading: true, hit: null });
      setMapFocusId(null);
      try {
        const res = await fetch(
          `/api/event-boundaries/pick?lat=${encodeURIComponent(String(rLat))}&lng=${encodeURIComponent(String(rLng))}&kind=${encodeURIComponent(kind)}`,
        );
        const body = (await res.json()) as { ok?: boolean; hit?: BoundarySearchHit };
        if (token !== mapPickDraftReqRef.current) return;
        if (body.hit) {
          setMapPickDraft({
            lat: rLat,
            lng: rLng,
            loading: false,
            hit: {
              ...body.hit,
              lat: body.hit.lat ?? rLat,
              lng: body.hit.lng ?? rLng,
            },
          });
          return;
        }
        if (kind === "point") {
          setMapPickDraft({
            lat: rLat,
            lng: rLng,
            loading: false,
            hit: {
              kind: "point",
              id: zoneKeyPoint(rLat, rLng),
              label: `${rLat.toFixed(5)}, ${rLng.toFixed(5)}`,
              lat: rLat,
              lng: rLng,
            },
          });
          return;
        }
        setMapPickDraft(null);
        toast.message(MAP_TAP_EMPTY_MESSAGE[kind]);
      } catch {
        if (token !== mapPickDraftReqRef.current) return;
        setMapPickDraft(null);
        toast.error("לא הצלחנו לזהות אזור");
      }
    },
    [],
  );

  const toggleMapTapMode = useCallback(() => {
    setMapTapMode((on) => {
      if (on) {
        mapPickDraftReqRef.current += 1;
        setMapPickDraft(null);
        return false;
      }
      setView("map");
      return true;
    });
  }, []);

  const onMapBackgroundTap = useCallback(
    (lat: number, lng: number) => {
      const onSelected = selectedZoneIdAtPoint(mapFeatures, selectedIds, lat, lng);
      if (onSelected) {
        setMapPickDraft(null);
        setMapFocusId((cur) => (cur === onSelected ? null : onSelected));
        return;
      }
      if (!mapTapMode) return;
      void loadMapPickDraft(lat, lng, boundaryKind);
    },
    [boundaryKind, loadMapPickDraft, mapFeatures, mapTapMode, selectedIds],
  );

  const confirmMapPickDraft = useCallback(async () => {
    if (!mapPickDraft || mapPickDraft.loading || !mapPickDraft.hit) return;
    const hit = mapPickDraft.hit;
    const plat = hit.lat ?? mapPickDraft.lat;
    const plng = hit.lng ?? mapPickDraft.lng;
    if (
      hit.kind === "point" &&
      pointCoveredBySelectedZones(plat, plng, mapFeatures, selectedIds)
    ) {
      toast.message("הנקודה כבר כלולה באזורים שבחרתם לאירוע");
      return;
    }
    setMapPickDraft(null);
    await attemptPickHit(hit);
  }, [attemptPickHit, mapFeatures, mapPickDraft, selectedIds]);

  useEffect(() => {
    setMapPickDraft(null);
  }, [boundaryKind]);

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
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (!searchChromeRef.current?.contains(target)) setSuggestOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, []);

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
        const features = body.features ?? [];
        setMapFeatures(features);

        const geoms = geometriesFromMapFeatures(features);
        const current = draftRef.current;
        const pruned = pruneZonesContainedInParents(current.zones, geoms);
        if (pruned.length < current.zones.length) {
          const removed = current.zones.filter((z) => !pruned.some((p) => p.id === z.id));
          persist({ ...current, zones: pruned });
          setMapFocusId((focus) => (focus && removed.some((z) => z.id === focus) ? null : focus));
          if (!skipPruneToastRef.current) {
            const names = removed.map((z) => z.label).join(", ");
            toast.message(`הוסר ${names} — כבר כלול באזור גדול יותר`);
          }
          skipPruneToastRef.current = false;
        }
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
  const showKindTabs = mapTapMode || mapPickDraft !== null;

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-[#0c0610]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ paddingBottom: footerPad }}>
        <header className="relative z-20 shrink-0 space-y-2 border-b border-white/8 bg-[#0c0610]/95 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md">
          <p className="text-right font-display text-lg text-orange-200">איפה האירוע?</p>
          <div ref={searchChromeRef} className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="relative z-10 min-w-0 flex-1 space-y-2">
                <BoundarySearchField
                  query={query}
                  onQueryChange={setQuery}
                  suggestOpen={suggestOpen}
                  onSuggestOpen={setSuggestOpen}
                  hits={hits}
                  loadingList={loadingList}
                  listError={listError}
                  selectedIds={selectedIds}
                  onPick={(hit) => void attemptPickHit(hit)}
                  listMode={view === "list"}
                  large={false}
                  placeholder="שכונה, רחוב, כתובת או עיר…"
                />
                {suggestOpen && query.trim().length > 0 && view === "map" ? (
                  <BoundarySuggestPanel
                    open
                    hits={hits}
                    loadingList={loadingList}
                    listError={listError}
                    selectedIds={selectedIds}
                    onPick={(hit) => void attemptPickHit(hit)}
                    query={query}
                  />
                ) : null}
              </div>
              <div className="relative z-20 flex shrink-0 items-start gap-2">
                <MapTapModeButton active={mapTapMode} onToggle={toggleMapTapMode} />
                <ViewToggle view={view} onViewChange={setView} />
              </div>
            </div>
            {showKindTabs ? (
              <>
                <p className="text-right text-sm leading-snug text-white/55">{MAP_TAP_KIND_HINT[boundaryKind]}</p>
                <MapTapKindToggle kind={boundaryKind} onKindChange={setBoundaryKind} />
              </>
            ) : null}
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          <div
            className={cn(
              "absolute inset-0",
              view !== "map" && "pointer-events-none invisible",
            )}
            aria-hidden={view !== "map"}
          >
            <EventCreatorMapDynamic
              className="absolute inset-0"
              features={mapFeatures}
              selectedIds={selectedIds}
              focusedId={mapFocusId}
              onAreaClick={onMapAreaClick}
              onBackgroundTap={onMapBackgroundTap}
              boundsFitKey={boundsFitKey}
              fitZoneId={fitZoneId}
              pointDraft={
                boundaryKind === "point" && mapPickDraft
                  ? { lat: mapPickDraft.lat, lng: mapPickDraft.lng }
                  : null
              }
              onPointDraftMove={(lat, lng) => void loadMapPickDraft(lat, lng, "point")}
            />
          </div>

          {view === "map" ? (
            <>
            {loadingMap ? (
              <div className="pointer-events-none absolute bottom-3 left-3 z-[300] rounded-full bg-black/60 px-3 py-1 text-xs text-white/70">
                מעדכן מפה…
              </div>
            ) : null}
            {mapPickDraft ? (
              <div
                className={cn(
                  "absolute inset-x-3 bottom-3 z-[400] rounded-xl border bg-[#140a1c]/96 p-3 shadow-lg backdrop-blur-md",
                  (mapPickDraft.hit?.kind ?? boundaryKind) === "point"
                    ? "border-violet-400/35"
                    : "border-amber-400/35",
                )}
              >
                <div className="flex items-start gap-3 text-right">
                  <EventBoundaryKindBadge
                    kind={mapPickDraft.hit?.kind ?? boundaryKind}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium leading-snug text-white/90 break-words">
                      {mapPickDraft.loading
                        ? "מזהה אזור…"
                        : (mapPickDraft.hit?.label ?? "—")}
                    </p>
                    {mapPickDraft.hit?.city && mapPickDraft.hit.kind !== "city" ? (
                      <p className="mt-0.5 text-sm leading-snug text-white/45 break-words">
                        {mapPickDraft.hit.city}
                      </p>
                    ) : null}
                    {(mapPickDraft.hit?.kind ?? boundaryKind) === "point" ? (
                      <p className="mt-1 text-xs leading-relaxed text-white/40 break-all tabular-nums">
                        {mapPickDraft.lat.toFixed(5)}, {mapPickDraft.lng.toFixed(5)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    disabled={mapPickDraft.loading || !mapPickDraft.hit}
                    className="min-h-12 flex-1 py-3 text-lg font-semibold bg-orange-500 text-black hover:bg-orange-400"
                    onClick={confirmMapPickDraft}
                  >
                    הוסף
                  </Button>
                  <button
                    type="button"
                    onClick={() => setMapPickDraft(null)}
                    className="min-h-12 shrink-0 rounded-xl px-4 text-base font-medium text-white/55 hover:bg-white/10"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            ) : mapFocusZone ? (
              <div className="absolute inset-x-3 bottom-3 z-[400] flex items-center gap-3 rounded-xl border border-amber-400/35 bg-[#140a1c]/96 p-3 shadow-lg backdrop-blur-md">
                <EventBoundaryKindBadge kind={mapFocusZone.kind} size="lg" />
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate text-lg text-white/90">{mapFocusZone.label}</p>
                  {mapFocusZone.city && mapFocusZone.kind !== "city" ? (
                    <p className="truncate text-base text-white/45">{mapFocusZone.city}</p>
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
              </div>
            ) : null}
            </>
          ) : (
            <div className="absolute inset-0 z-10 overflow-y-auto overscroll-y-contain bg-[#0c0610] px-3 pb-4 pt-2">
              {draft.zones.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 py-16 text-center text-lg text-white/45">
                  חפשו למעלה והוסיפו אזור — או עברו למפה
                </div>
              ) : (
                <ul className="space-y-3">
                  {draft.zones.map((z) => (
                    <li key={z.id}>
                      <EventZoneListRow zone={z} showDelete onDelete={() => removeZone(z.id)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <ZoneContainmentDialog
        open={containmentPrompt !== null}
        newLabel={containmentPrompt?.hit.label ?? ""}
        contained={containmentPrompt?.contained ?? []}
        onConfirm={confirmContainmentPick}
        onCancel={() => setContainmentPrompt(null)}
      />

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
