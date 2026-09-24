"use client";

import { useMemo, useState, useCallback } from "react";
import { Camera, Gem, MapPin } from "lucide-react";
import { GemCheer } from "@/components/gem-cheer";
import { GemHuntOverlay } from "@/components/gem-hunt/gem-hunt-overlay";
import { Button } from "@/components/ui/button";
import { useGemProgress } from "@/hooks/use-gem-progress";
import { useStandingStill } from "@/hooks/use-standing-still";
import { gemHuntFabVisible } from "@/lib/gem-hunt-enabled";
import { useAppNow } from "@/hooks/use-app-clock";
import {
  canCollectGem,
  gemAnchorForHouse,
  gemProximity,
  gemLabelHe,
  gemMonsterForHouse,
  GEM_APPROACH_METERS,
  GEM_HUNT_METERS,
  GEM_CHEER_MS,
} from "@/lib/gem-hunt";
import { distanceMeters, formatDistance } from "@/lib/geo";
import type { PublicHouse } from "@/lib/types";
import type { UserLocation } from "@/hooks/use-user-location";
import { prepareGemHuntSensors, stopGemHuntCameraStream } from "@/lib/gem-hunt-sensors";
import {
  clearGemAnchorOverride,
  setGemAnchorOverride,
} from "@/lib/gem-anchor-overrides";
import { useGemAnchorOverrides } from "@/hooks/use-gem-anchor-overrides";
import { cn } from "@/lib/utils";

export function GemHuntPanel({
  house,
  userLocation,
  isAdmin,
  adminSimulateInRange = false,
}: {
  house: PublicHouse;
  userLocation: UserLocation | null;
  isAdmin: boolean;
  adminSimulateInRange?: boolean;
}) {
  const gems = useGemProgress();
  const { overrides: anchorOverrideMap } = useGemAnchorOverrides();
  const [huntOpen, setHuntOpen] = useState(false);
  const [cheer, setCheer] = useState(false);
  const [simulate, setSimulate] = useState(adminSimulateInRange);

  const now = useAppNow();
  const visible = gemHuntFabVisible(isAdmin, now);
  const collected = gems.collected(house.id);
  const proximity = gemProximity(userLocation, house, collected);
  const { ready: standingStill } = useStandingStill(userLocation, visible && !collected);

  const distanceM = useMemo(() => {
    if (!userLocation) return null;
    return distanceMeters(userLocation, house);
  }, [house, userLocation]);

  if (!visible) return null;

  const canCollect = canCollectGem(userLocation, house, collected, standingStill, simulate);
  const monsterLabel = gemLabelHe(gemMonsterForHouse(house));
  const anchor = gemAnchorForHouse(house);
  const anchorCalibrated = Boolean(anchorOverrideMap[house.id]) || anchor.calibrated === true;

  const openCamera = useCallback(async () => {
    await prepareGemHuntSensors();
    setHuntOpen(true);
  }, []);

  function onCollect(collectedVariant: string) {
    gems.collect(house.id, collectedVariant);
    stopGemHuntCameraStream();
    setHuntOpen(false);
    setCheer(true);
    window.setTimeout(() => setCheer(false), GEM_CHEER_MS);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(40);
    }
  }

  return (
    <>
      <GemCheer show={cheer} />
      <section className="gem-hunt-panel" dir="rtl">
        <div className="gem-hunt-panel__head">
          <Gem className="size-5 text-amber-300" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="gem-hunt-panel__title">יהלום נסתר</p>
            <p className="gem-hunt-panel__sub">
              {collected
                ? `נאסף — ${monsterLabel}`
                : canCollect
                  ? "מוכנים לאיסוף!"
                  : proximity === "far"
                    ? "אפשר לצפות במצלמה מכל מקום · לאיסוף התקרבו לבית"
                    : proximity === "approach"
                      ? `עוד ${distanceM != null ? formatDistance(Math.max(0, distanceM - GEM_HUNT_METERS)) : "קצת"} — אפשר לצפות, לאיסוף התקרבו`
                      : standingStill || simulate
                        ? "מוכנים לציד!"
                        : "עמדו במקום לרגע… או פתחו מצלמה לתצוגה"}
            </p>
          </div>
        </div>

        {isAdmin ? (
          <div className="gem-hunt-panel__admin-tools">
            <label className="gem-hunt-panel__simulate">
              <input
                type="checkbox"
                checked={simulate}
                onChange={(e) => setSimulate(e.target.checked)}
              />
              סימולציה: בטווח (מנהל)
            </label>
            <div className="gem-hunt-panel__calibrate">
              <p className="gem-hunt-panel__calibrate-title">
                {anchorCalibrated ? "מיקום יהלום: מותאם בטלפון" : "מיקום יהלום: אוטומטי ליד הבית"}
              </p>
              <p className="gem-hunt-panel__calibrate-hint">
                הלכו physically למקום הרצוי (לובי, חצר, ליד הדלת), עמדו שם, ואז:
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-amber-400/40 text-amber-100"
                disabled={!userLocation}
                onClick={() => userLocation && setGemAnchorOverride(house.id, userLocation)}
              >
                <MapPin className="size-3.5" aria-hidden />
                קבע מיקום יהלום כאן (GPS)
              </Button>
              {anchorCalibrated ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-violet-300"
                  onClick={() => clearGemAnchorOverride(house.id)}
                >
                  איפוס — חזרה למיקום אוטומטי
                </Button>
              ) : null}
              {userLocation && anchorCalibrated ? (
                <p className="gem-hunt-panel__calibrate-dist" dir="ltr">
                  אתם ~{Math.round(distanceMeters(userLocation, anchor))}m מהנקודה שנשמרה
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          className={cn(
            "gem-hunt-panel__btn w-full",
            canCollect && "ring-2 ring-amber-400/50",
          )}
          onClick={() => void openCamera()}
        >
          <Camera className="size-4" aria-hidden />
          {collected ? "הציגו שוב במצלמה" : "פתחו מצלמה — חיפוש היהלום"}
        </Button>

        {!collected && canCollect ? (
          <p className="gem-hunt-panel__distance text-center text-sm text-emerald-300/90">
            <MapPin className="mb-0.5 inline size-3.5" aria-hidden /> בטווח — אפשר לאסוף במצלמה
          </p>
        ) : null}

        {collected ? (
          <div className="gem-hunt-panel__done-col">
            <div className="gem-hunt-panel__done">
              <Gem className="size-4 text-emerald-300" aria-hidden />
              נאסף
            </div>
            {isAdmin ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gem-hunt-panel__reset-btn w-full"
                onClick={() => gems.resetHouse(house.id)}
              >
                איפוס — ילד/ה הבא יחפש שוב
              </Button>
            ) : null}
          </div>
        ) : null}

        {!collected && proximity !== "far" && distanceM != null ? (
          <p className="gem-hunt-panel__distance" dir="ltr">
            ~{Math.round(distanceM)}m
          </p>
        ) : null}
      </section>

      {huntOpen ? (
        <GemHuntOverlay
          house={house}
          userLocation={userLocation}
          simulateInRange={simulate}
          collectEnabled={canCollect}
          onClose={() => {
            stopGemHuntCameraStream();
            setHuntOpen(false);
          }}
          onCollect={onCollect}
        />
      ) : null}
    </>
  );
}
