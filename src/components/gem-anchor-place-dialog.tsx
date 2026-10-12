"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { HouseEditModal } from "@/components/house-edit-modal";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { Button } from "@/components/ui/button";
import { useGemAnchorOverrides } from "@/hooks/use-gem-anchor-overrides";
import { clearGemAnchorOverride } from "@/lib/gem-anchor-overrides";
import { GEM_ANCHOR_PLACE_MAX_METERS } from "@/lib/gem-anchor-placement";
import { gemAnchorForHouse, placedGemAnchorForHouse } from "@/lib/gem-hunt";
import {
  GEM_PLACE_ACTION_HE,
  GEM_PLACE_HINT_HE,
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
  const placed = placedGemAnchorForHouse(house);
  const [point, setPoint] = useState<LatLng>(current);
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) setPoint(current);
    wasOpen.current = open;
  }, [open, current]);

  const distanceM = Math.round(distanceMeters(house, point));
  const dirty = !samePoint(point, current);

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

  async function reset() {
    if (!window.confirm(`${GEM_PLACE_RESET_HE}?`)) return;
    if (await send("DELETE", {})) {
      toast.success(GEM_PLACE_RESET_DONE_HE);
      onClose();
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
              gemAnchorEdit={{ house, point, onMove: setPoint }}
            />
          ) : null}
        </div>
        <p className="text-sm text-violet-300">
          {placed ? GEM_PLACE_STATUS_PLACED_HE : GEM_PLACE_STATUS_AUTO_HE} · {distanceM} מ׳ מהבית (עד{" "}
          {GEM_ANCHOR_PLACE_MAX_METERS} מ׳)
        </p>
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
        {placed ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full text-violet-300"
            disabled={saving}
            onClick={() => void reset()}
          >
            {GEM_PLACE_RESET_HE}
          </Button>
        ) : null}
      </div>
    </HouseEditModal>
  );
}
