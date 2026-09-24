"use client";

import { useMemo, useState } from "react";
import { Gem, MapPin } from "lucide-react";
import { GemCollectCheer } from "@/components/gem-collect-cheer";
import { GemHuntOverlay } from "@/components/gem-hunt/gem-hunt-overlay";
import { Button } from "@/components/ui/button";
import { useGemProgress } from "@/hooks/use-gem-progress";
import { useStandingStill } from "@/hooks/use-standing-still";
import { gemHuntVisible } from "@/lib/gem-hunt-enabled";
import {
  gemProximity,
  gemLabelHe,
  GEM_APPROACH_METERS,
  GEM_HUNT_METERS,
  GEM_COLLECT_ANIMATION_MS,
} from "@/lib/gem-hunt";
import { distanceMeters, formatDistance } from "@/lib/geo";
import type { PublicHouse } from "@/lib/types";
import type { UserLocation } from "@/hooks/use-user-location";
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
  const [huntOpen, setHuntOpen] = useState(false);
  const [cheer, setCheer] = useState(false);
  const [simulate, setSimulate] = useState(adminSimulateInRange);
  const [labOpen, setLabOpen] = useState(false);

  const visible = gemHuntVisible(isAdmin);
  const collected = gems.collected(house.id);
  const proximity = gemProximity(userLocation, house, collected);
  const { ready: standingStill } = useStandingStill(userLocation, visible && !collected);

  const distanceM = useMemo(() => {
    if (!userLocation) return null;
    return distanceMeters(userLocation, house);
  }, [house, userLocation]);

  if (!visible) return null;

  const inRange = simulate || proximity === "hunt";
  const canHunt = collected ? false : inRange && (standingStill || simulate);

  function openHunt() {
    if (!canHunt) return;
    setHuntOpen(true);
  }

  function onCollect(collectedVariant: string) {
    gems.collect(house.id, collectedVariant);
    setHuntOpen(false);
    setCheer(true);
    window.setTimeout(() => setCheer(false), GEM_COLLECT_ANIMATION_MS + 400);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(40);
    }
  }

  return (
    <>
      <GemCollectCheer show={cheer} house={house} />
      <section className="gem-hunt-panel" dir="rtl">
        <div className="gem-hunt-panel__head">
          <Gem className="size-5 text-amber-300" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="gem-hunt-panel__title">אוצר נסתר</p>
            <p className="gem-hunt-panel__sub">
              {collected
                ? "נאסף לתיק האוצרות"
                : proximity === "far"
                  ? "התקרבו לבית כדי לחפש"
                  : proximity === "approach"
                    ? `עוד ${distanceM != null ? formatDistance(Math.max(0, distanceM - GEM_HUNT_METERS)) : "קצת"} — עמדו על המרפסת`
                    : standingStill || simulate
                      ? "מוכנים לציד!"
                      : "עמדו במקום לרגע…"}
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gem-hunt-panel__lab-btn w-full"
              onClick={() => setLabOpen(true)}
            >
              ניסיון מצלמה (מכל מקום)
            </Button>
          </div>
        ) : null}

        {collected ? (
          <div className="gem-hunt-panel__done">
            <Gem className="size-4 text-emerald-300" aria-hidden />
            נאסף
          </div>
        ) : (
          <Button
            type="button"
            className={cn(
              "gem-hunt-panel__btn w-full",
              canHunt && "bg-amber-400 text-black hover:bg-amber-300",
            )}
            disabled={!canHunt}
            onClick={openHunt}
          >
            <MapPin className="size-4" aria-hidden />
            {canHunt ? "חפשו את האוצר" : proximity === "approach" ? `התקרבו (${GEM_APPROACH_METERS}מ׳)` : "חפשו את האוצר"}
          </Button>
        )}

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
          onClose={() => setHuntOpen(false)}
          onCollect={onCollect}
        />
      ) : null}

      {labOpen ? (
        <GemHuntOverlay
          house={house}
          userLocation={userLocation}
          labMode
          onClose={() => setLabOpen(false)}
          onCollect={(id) => {
            onCollect(id);
            setLabOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
