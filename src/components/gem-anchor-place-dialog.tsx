"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { HouseEditModal } from "@/components/house-edit-modal";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { Button } from "@/components/ui/button";
import { useGemAnchorOverrides } from "@/hooks/use-gem-anchor-overrides";
import { clearGemAnchorOverride } from "@/lib/gem-anchor-overrides";
import { copyText } from "@/lib/copy-text";
import { gemAnchorPlacementError, GEM_ANCHOR_PLACE_MAX_METERS } from "@/lib/gem-anchor-placement";
import {
  automaticGemAnchorForHouse,
  gemAnchorForHouse,
  placedGemAnchorForHouse,
} from "@/lib/gem-hunt";
import {
  GEM_PLACE_ACTION_HE,
  GEM_PLACE_HINT_HE,
  GEM_PLACE_MY_LOCATION_HE,
  GEM_PLACE_RESET_CONFIRM_HE,
  GEM_PLACE_RESET_DONE_HE,
  GEM_PLACE_RESET_HE,
  GEM_PLACE_RESET_HINT_HE,
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
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) setPoint(current);
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
    if (await send("PUT", { lat: point.lat, lng: point.lng })) {
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
        <p className="text-base leading-relaxed text-violet-100">{GEM_PLACE_HINT_HE}</p>
        <div className="h-72 overflow-hidden rounded-xl ring-1 ring-orange-500/25">
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
        <p className="text-sm text-violet-400">{GEM_PLACE_RESET_HINT_HE}</p>
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
