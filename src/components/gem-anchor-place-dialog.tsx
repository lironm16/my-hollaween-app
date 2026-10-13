"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, LocateFixed, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { ImpDemonFilledIcon } from "@/components/imp-demon-reference-icon";
import { toast } from "sonner";
import { HouseEditModal } from "@/components/house-edit-modal";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { Button } from "@/components/ui/button";
import { useGemAnchorOverrides } from "@/hooks/use-gem-anchor-overrides";
import { clearGemAnchorOverride } from "@/lib/gem-anchor-overrides";
import { copyText } from "@/lib/copy-text";
import {
  clampGemAnchorPlacement,
  gemAnchorPlacementError,
  GEM_ANCHOR_PLACE_MAX_METERS,
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
  GEM_PLACE_MAP_EXPAND_HE,
  GEM_PLACE_MAP_SHRINK_HE,
  GEM_PLACE_MY_LOCATION_HE,
  GEM_PLACE_RESET_CONFIRM_HE,
  GEM_PLACE_RESET_DONE_HE,
  GEM_PLACE_RESET_HE,
  GEM_PLACE_SAVE_HE,
  GEM_PLACE_SAVED_HE,
  GEM_PLACE_STATUS_AUTO_HE,
  GEM_PLACE_STATUS_PLACED_HE,
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

/** Page-level state for {@link GemAnchorPlaceDialog} — `open(house, editCode)` from a ⋮ menu. */
export function useGemAnchorPlacer() {
  const [target, setTarget] = useState<{ house: PublicHouse; editCode?: string } | null>(null);
  const open = useCallback((house: PublicHouse, editCode?: string) => setTarget({ house, editCode }), []);
  const dialog = target ? (
    <GemAnchorPlaceDialog
      open
      house={target.house}
      editCode={target.editCode}
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
  onClose,
}: {
  open: boolean;
  house: PublicHouse;
  editCode?: string;
  onClose: () => void;
}) {
  const { overrides } = useGemAnchorOverrides();
  const deviceOverride = Boolean(overrides[house.id]);
  const current = useMemo(() => {
    void overrides;
    const a = gemAnchorForHouse(house);
    return { lat: a.lat, lng: a.lng };
  }, [house, overrides]);
  const auto = useMemo(() => {
    const a = automaticGemAnchorForHouse(house);
    return { lat: a.lat, lng: a.lng };
  }, [house]);
  const placed = placedGemAnchorForHouse(house);
  const [point, setPoint] = useState<LatLng>(current);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) setPoint(current);
    if (!open) setMapExpanded(false);
    wasOpen.current = open;
  }, [open, current]);

  const distanceM = Math.round(distanceMeters(house, point));
  const coordsText = `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
  const dirty = !samePoint(point, current);
  const atAuto = samePoint(point, auto);

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
    if (await send("PUT", { lat: clamped.lat, lng: clamped.lng })) {
      toast.success(GEM_PLACE_SAVED_HE);
      onClose();
    }
  }

  function applyMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("המכשיר לא תומך במיקום.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (gemAnchorPlacementError(house, here)) {
          toast.error(
            `אתם ${Math.round(distanceMeters(house, here))} מ׳ מהבית — צריך לעמוד עד ${GEM_ANCHOR_PLACE_MAX_METERS} מ׳ ממנו.`,
          );
          return;
        }
        setPoint(here);
        setAccuracyM(Math.round(pos.coords.accuracy));
      },
      () => {
        setLocating(false);
        toast.error("לא הצלחנו לקבל מיקום. בדקו שהרשאת מיקום פתוחה.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function reset() {
    setAccuracyM(null);
    if (!placed) {
      setPoint(auto);
      return;
    }
    if (!window.confirm(`${GEM_PLACE_RESET_HE}? ${GEM_PLACE_RESET_CONFIRM_HE}`)) return;
    if (await send("DELETE", {})) {
      setPoint(auto);
      toast.success(GEM_PLACE_RESET_DONE_HE);
    }
  }

  return (
    <HouseEditModal open={open} onClose={onClose} title={GEM_PLACE_ACTION_HE} subtitle={houseHeadline(house)}>
      <div className="space-y-3">
        <GemAnchorPlaceHint />
        <div
          className={
            mapExpanded
              ? "fixed inset-0 z-[220] flex flex-col gap-2 bg-[#14091c] p-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
              : undefined
          }
        >
          <div
            className={
              mapExpanded
                ? "relative min-h-0 flex-1 overflow-hidden rounded-xl ring-1 ring-orange-500/25"
                : "relative h-72 overflow-hidden rounded-xl ring-1 ring-orange-500/25"
            }
          >
            {open ? (
              <HouseMapDynamic
                houses={[house]}
                selectedId={house.id}
                embed
                className="h-full w-full"
                gemAnchorEdit={{
                  house,
                  point,
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
              className="absolute end-2 top-2 z-[510] flex size-10 items-center justify-center rounded-lg bg-black/55 text-orange-100 ring-1 ring-orange-500/35"
              aria-label={mapExpanded ? GEM_PLACE_MAP_SHRINK_HE : GEM_PLACE_MAP_EXPAND_HE}
              onClick={() => setMapExpanded((v) => !v)}
            >
              {mapExpanded ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
            </button>
          </div>
          <div className="pointer-events-auto flex justify-center gap-1">
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
                className="flex size-9 items-center justify-center rounded-lg bg-black/40 text-orange-100 ring-1 ring-orange-500/25"
                aria-label={`${dir} 1m`}
                onClick={() => {
                  setPoint((prev) => nudgeGemAnchorPoint(house, prev, dir as GemAnchorNudge));
                  setAccuracyM(null);
                }}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1 rounded-lg bg-black/25 px-3 py-2 text-sm ring-1 ring-orange-500/15">
          <p className="text-violet-200">
            {placed ? GEM_PLACE_STATUS_PLACED_HE : GEM_PLACE_STATUS_AUTO_HE}
            {dirty ? " · לא נשמר" : ""}
          </p>
          <button
            type="button"
            dir="ltr"
            className="block font-mono text-orange-100 underline-offset-2 hover:underline"
            onClick={() => void copyText(coordsText, "הקואורדינטות הועתקו")}
          >
            {coordsText}
          </button>
          <p className="text-violet-300">
            {distanceM} מ׳ מהבית (עד {GEM_ANCHOR_PLACE_MAX_METERS} מ׳)
            {accuracyM != null ? ` · דיוק GPS ~${accuracyM} מ׳` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-w-0 flex-1 justify-center text-base"
            disabled={locating || saving}
            onClick={applyMyLocation}
          >
            <LocateFixed className="size-5" />
            {locating ? "מאתרים…" : GEM_PLACE_MY_LOCATION_HE}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 min-w-0 flex-1 justify-center text-base"
            disabled={saving || (atAuto && !placed)}
            onClick={() => void reset()}
          >
            <RotateCcw className="size-5" />
            {GEM_PLACE_RESET_HE}
          </Button>
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
