"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, LocateFixed, RotateCcw } from "lucide-react";
import { ImpDemonFilledIcon } from "@/components/imp-demon-reference-icon";
import { toast } from "sonner";
import { HouseEditModal } from "@/components/house-edit-modal";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { Button } from "@/components/ui/button";
import { useGemAnchorOverrides } from "@/hooks/use-gem-anchor-overrides";
import {
  resolveUserLocationForUi,
  type UserLocation,
} from "@/hooks/use-user-location";
import { clearGemAnchorOverride, GEM_ANCHOR_CHANGED_EVENT } from "@/lib/gem-anchor-overrides";
import { copyText } from "@/lib/copy-text";
import {
  clampGemAnchorPlacement,
  nudgeGemAnchorPoint,
  type GemAnchorNudge,
} from "@/lib/gem-anchor-placement";
import {
  automaticGemAnchorForHouse,
  gemAnchorForHouse,
  placedGemAnchorForHouse,
} from "@/lib/gem-hunt";
import {
  GEM_PLACE_ACTION_HE,
  GEM_PLACE_HINT_HE,
  GEM_PLACE_MY_LOCATION_HE,
  GEM_PLACE_RESET_HE,
  GEM_PLACE_SAVE_HE,
  GEM_PLACE_SAVED_HE,
} from "@/lib/gem-hunt-copy";
import { notePlacedGemAnchor } from "@/lib/gem-placed-anchors";
import { distanceMeters } from "@/lib/geo";
import { houseHeadline } from "@/lib/labels";
import { notifyCatalogChanged } from "@/lib/offline-db";
import type { LatLng } from "@/lib/route";
import type { GemAnchorPlacement, PublicHouse } from "@/lib/types";

type SaveResponse = {
  gemAnchor?: GemAnchorPlacement | null;
  house?: { updatedAt?: string };
  error?: string;
};

function samePoint(a: LatLng, b: LatLng) {
  return Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7;
}

export type GemAnchorPlacerOptions = {
  /** Live GPS from the host page (main map blue dot). */
  userLocation?: UserLocation | null;
  refreshLocation?: () => Promise<UserLocation | null>;
};

/** Page-level state for {@link GemAnchorPlaceDialog} — `open(house, editCode)` from a ⋮ menu. */
export function useGemAnchorPlacer(options: GemAnchorPlacerOptions = {}) {
  const { userLocation = null, refreshLocation } = options;
  const [target, setTarget] = useState<{ house: PublicHouse; editCode?: string } | null>(null);
  const open = useCallback((house: PublicHouse, editCode?: string) => setTarget({ house, editCode }), []);
  const dialog = target ? (
    <GemAnchorPlaceDialog
      open
      house={target.house}
      editCode={target.editCode}
      userLocation={userLocation}
      refreshLocation={refreshLocation}
      onClose={() => setTarget(null)}
    />
  ) : null;
  return { open, dialog };
}

function GemAnchorPlaceHint() {
  return (
    <p className="text-base leading-relaxed text-violet-100" aria-label={GEM_PLACE_HINT_HE}>
      מקמו את{" "}
      <span className="inline-flex items-center gap-1.5 align-middle">
        <ImpDemonFilledIcon className="size-5 shrink-0 text-emerald-400" aria-hidden />
        <span className="font-medium text-violet-50">השדון</span>
      </span>{" "}
      איפה שתרצו בקרבת{" "}
      <span className="inline-flex items-center gap-1.5 align-middle">
        <span
          className="inline-block size-2.5 shrink-0 rounded-full bg-orange-500 ring-2 ring-[#fff7ed]"
          aria-hidden
        />
        <span className="font-medium text-violet-50">הבית</span>
      </span>
      .
    </p>
  );
}

/** Owner/admin — see where the house gem hides and drag it to a better spot (shared with everyone). */
export function GemAnchorPlaceDialog({
  open,
  house,
  editCode,
  userLocation: knownUserLocation = null,
  refreshLocation,
  onClose,
}: {
  open: boolean;
  house: PublicHouse;
  editCode?: string;
  userLocation?: UserLocation | null;
  refreshLocation?: () => Promise<UserLocation | null>;
  onClose: () => void;
}) {
  const { overrides } = useGemAnchorOverrides();
  const deviceOverride = Boolean(overrides[house.id]);
  void overrides;
  const auto = useMemo(() => {
    const a = automaticGemAnchorForHouse(house);
    return { lat: a.lat, lng: a.lng };
  }, [house]);
  const [point, setPoint] = useState<LatLng>(() => ({ lat: house.lat, lng: house.lng }));
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [mapFitTick, setMapFitTick] = useState(0);
  const wasOpen = useRef(false);
  const [anchorRevision, setAnchorRevision] = useState(0);

  useEffect(() => {
    const bump = () => setAnchorRevision((n) => n + 1);
    window.addEventListener(GEM_ANCHOR_CHANGED_EVENT, bump);
    return () => window.removeEventListener(GEM_ANCHOR_CHANGED_EVENT, bump);
  }, []);

  const resolvedCurrent = useMemo(() => {
    void anchorRevision;
    const a = gemAnchorForHouse(house);
    return { lat: a.lat, lng: a.lng };
  }, [house, anchorRevision]);

  const placed = useMemo(() => {
    void anchorRevision;
    return placedGemAnchorForHouse(house);
  }, [house, anchorRevision]);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setPoint(resolvedCurrent);
      setMyLocation(null);
      setAccuracyM(null);
      setMapFitTick((tick) => tick + 1);
    }
    wasOpen.current = open;
  }, [open, resolvedCurrent]);

  const distanceM = Math.round(distanceMeters(house, point));
  const coordsText = `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
  const dirty = !samePoint(point, resolvedCurrent);
  const atAuto = samePoint(point, auto);
  const mapDistanceLine = useMemo(() => {
    const parts = [`${distanceM} מ׳ מהבית`];
    if (accuracyM != null) parts.push(`דיוק GPS ~${accuracyM} מ׳`);
    if (dirty) parts.push("לא נשמר");
    return parts.join(" · ");
  }, [distanceM, accuracyM, dirty]);

  async function send(method: "PUT" | "DELETE", body: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/houses/${encodeURIComponent(house.id)}/gem-anchor`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, ...(editCode ? { editCode } : {}) }),
      });
      const json = (await res.json().catch(() => null)) as SaveResponse | null;
      if (!res.ok) {
        toast.error(json?.error ?? "השמירה נכשלה.");
        return false;
      }
      notePlacedGemAnchor(house.id, json?.gemAnchor ?? null, json?.house?.updatedAt ?? new Date().toISOString());
      notifyCatalogChanged();
      return true;
    } catch {
      toast.error("אין חיבור לשרת. נסו שוב.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    const clamped = clampGemAnchorPlacement(house, point);
    if (!samePoint(clamped, point)) setPoint(clamped);
    const backToAuto = samePoint(clamped, auto);
    if (backToAuto) {
      if (!placed) {
        onClose();
        return;
      }
      if (await send("DELETE", {})) {
        toast.success(GEM_PLACE_SAVED_HE);
        onClose();
      }
      return;
    }
    if (await send("PUT", { lat: clamped.lat, lng: clamped.lng })) {
      toast.success(GEM_PLACE_SAVED_HE);
      onClose();
    }
  }

  function applyGpsFix(here: UserLocation) {
    const accuracy = Math.round(here.accuracy);
    setMyLocation({ lat: here.lat, lng: here.lng });
    setAccuracyM(accuracy);
    setMapFitTick((tick) => tick + 1);
  }

  async function applyMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("המכשיר לא תומך במיקום.");
      return;
    }
    setLocating(true);
    try {
      const fix = await resolveUserLocationForUi({
        seed: knownUserLocation,
        refresh: refreshLocation,
      });
      if (!fix) {
        toast.error("לא הצלחנו לקבל מיקום. בדקו שהרשאת מיקום פתוחה.");
        return;
      }
      applyGpsFix(fix);
    } finally {
      setLocating(false);
    }
  }

  function reset() {
    setAccuracyM(null);
    setMyLocation(null);
    setPoint(auto);
  }

  return (
    <HouseEditModal open={open} onClose={onClose} title={GEM_PLACE_ACTION_HE} subtitle={houseHeadline(house)}>
      <div className="space-y-3">
        <GemAnchorPlaceHint />
        <div>
          <div className="relative h-72 overflow-hidden rounded-xl ring-1 ring-orange-500/25">
            {open ? (
              <HouseMapDynamic
                houses={[house]}
                selectedId={house.id}
                embed
                embedCenterOnSelect={false}
                className="h-full w-full"
                gemAnchorEdit={{
                  house,
                  point,
                  fitTick: mapFitTick,
                  myLocation,
                  myLocationAccuracyM: accuracyM,
                  onMove: (next) => {
                    setPoint(next);
                    setAccuracyM(null);
                  },
                }}
              />
            ) : null}
            <div
              className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center"
              aria-hidden
            >
              <div className="map-gem-diamond-marker map-gem-diamond-marker--admin is-calibrated is-editing gem-anchor-place-map__pin">
                <span className="map-gem-imp-marker__glyph">
                  <ImpDemonFilledIcon className="map-gem-imp-marker__svg size-full" />
                </span>
              </div>
            </div>
            <button
              type="button"
              dir="rtl"
              className="gem-anchor-place-map__footer absolute inset-x-2 bottom-2 z-[510] flex max-w-[calc(100%-1rem)] items-center gap-2 rounded-lg bg-black/65 px-2.5 py-1.5 text-start ring-1 ring-orange-500/30 backdrop-blur-sm"
              title={`${mapDistanceLine} · ${coordsText}`}
              onClick={() => void copyText(coordsText, "הקואורדינטות הועתקו")}
            >
              <span className="min-w-0 flex-1 truncate text-sm leading-tight text-violet-100">
                {mapDistanceLine}
              </span>
              <span dir="ltr" className="shrink-0 font-mono text-xs tabular-nums text-orange-100">
                {coordsText}
              </span>
            </button>
          </div>
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 pt-1">
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 gap-1.5 px-2.5 text-sm"
              disabled={locating || saving}
              onClick={applyMyLocation}
            >
              <LocateFixed className="size-4 shrink-0" />
              {locating ? "מאתרים…" : GEM_PLACE_MY_LOCATION_HE}
            </Button>
            {(
              [
                ["north", ArrowUp],
                ["west", ArrowLeft],
                ["east", ArrowRight],
                ["south", ArrowDown],
              ] as const
            ).map(([dir, Icon]) => (
              <button
                key={dir}
                type="button"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/40 text-orange-100 ring-1 ring-orange-500/25"
                aria-label={`${dir} 1m`}
                onClick={() => {
                  setPoint((prev) => nudgeGemAnchorPoint(house, prev, dir as GemAnchorNudge));
                  setAccuracyM(null);
                }}
              >
                <Icon className="size-4" />
              </button>
            ))}
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 gap-1.5 px-2.5 text-sm"
              disabled={saving || atAuto}
              onClick={() => void reset()}
            >
              <RotateCcw className="size-4 shrink-0" />
              {GEM_PLACE_RESET_HE}
            </Button>
          </div>
        </div>
        {deviceOverride ? (
          <p className="text-sm text-amber-200">
            בטלפון הזה יש כיול GPS מקומי שדורס את המיקום.{" "}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => clearGemAnchorOverride(house.id)}
            >
              ביטול הכיול המקומי
            </button>
          </p>
        ) : null}
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            className="h-11 min-w-0 flex-1 justify-center bg-orange-500 text-base text-black hover:bg-orange-400"
            disabled={!dirty || saving}
            onClick={() => void save()}
          >
            {GEM_PLACE_SAVE_HE}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 min-w-0 flex-1 justify-center text-base"
            onClick={onClose}
          >
            ביטול
          </Button>
        </div>
      </div>
    </HouseEditModal>
  );
}
