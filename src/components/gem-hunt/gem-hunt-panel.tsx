"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, MapPin } from "lucide-react";
import { GemCheer } from "@/components/gem-cheer";
import { GemHouseFoundHero } from "@/components/gem-hunt/gem-house-found-hero";
import type { GemCollectFinishOptions } from "@/lib/gem-hunt";
import { GemHuntExperienceLazy } from "@/components/gem-hunt/gem-hunt-lazy";
import { isAndroidLike, supportsWebXrHitTestAr, webXrHitTestArCached } from "@/lib/gem-hunt-ar-platform";
import { endGemHuntWebXrSession, requestGemHuntWebXrSession } from "@/lib/gem-hunt-webxr-session";
import { getGemHuntPortalRoot } from "@/lib/gem-hunt-portal-root";
import { Button } from "@/components/ui/button";
import { useGemProgress } from "@/hooks/use-gem-progress";
import { useGemHuntAdminUi } from "@/hooks/use-gem-admin-ui";
import { useAppNow } from "@/hooks/use-app-clock";
import {
  canCollectGem,
  gemAnchorForHouse,
  gemDistanceMeters,
  gemProximity,
  GEM_CHEER_MS,
  activeGemHuntMeters,
} from "@/lib/gem-hunt";
import type { GemMonsterId } from "@/lib/gem-monsters";
import { distanceMeters } from "@/lib/geo";
import type { PublicHouse } from "@/lib/types";
import type { UserLocation } from "@/hooks/use-user-location";
import {
  GEM_ANCHOR_RESET_ALL_HE,
  GEM_ANCHOR_RESET_ONE_HE,
  GEM_ANCHOR_SET_GPS_HE,
  GEM_ANCHOR_TITLE_AUTO_HE,
  GEM_ANCHOR_TITLE_CALIBRATED_HE,
  GEM_ANCHOR_UPDATE_PUBLIC_HE,
  GEM_PANEL_NEAR_GPS_HE,
  gemPanelApproachHe,
  gemPanelOpenCameraHe,
} from "@/lib/gem-hunt-copy";

export type GemHuntOpenPrepare = () => Promise<UserLocation | null | void>;
import { gemBagCelebrateAfterCollect, gemBagCollectHref } from "@/lib/gem-bag-celebrate";
import { loadGemCollected } from "@/lib/gem-progress";
import {
  isGemHuntOrientationGranted,
  prepareGemHuntSensors,
  releaseGemHuntCamera,
} from "@/lib/gem-hunt-sensors";
import {
  clearAllGemAnchorOverrides,
  clearGemAnchorOverride,
  countGemAnchorOverrides,
  setGemAnchorOverride,
} from "@/lib/gem-anchor-overrides";
import { useGemAnchorOverrides } from "@/hooks/use-gem-anchor-overrides";
import { cn } from "@/lib/utils";
import { gemTellMeHuntRadiusEnforced } from "@/lib/gem-tell-me-gate";
import { gemClusterQueueHeadline, nextClusterGemHouse } from "@/lib/gem-campus-queue";

export function GemHuntPanel({
  house,
  userLocation,
  isAdmin,
  adminSimulateInRange = false,
  onOpenHunt,
  mapHousesForCelebrate = [],
}: {
  house: PublicHouse;
  userLocation: UserLocation | null;
  isAdmin: boolean;
  adminSimulateInRange?: boolean;
  /** Same tap as «פתחו מצלמה» — request GPS + sensors (iOS needs gesture). */
  onOpenHunt?: GemHuntOpenPrepare;
  /** Map-eligible houses — used for milestone query on /gem-bag after collect. */
  mapHousesForCelebrate?: PublicHouse[];
}) {
  const gems = useGemProgress();
  const { overrides: anchorOverrideMap } = useGemAnchorOverrides();
  const calibratedCount = useMemo(() => countGemAnchorOverrides(), [anchorOverrideMap]);
  const router = useRouter();
  const [huntOpen, setHuntOpen] = useState(false);
  /** Active row during multi-house cluster camera session (may differ from panel `house`). */
  const [huntTargetHouse, setHuntTargetHouse] = useState<PublicHouse | null>(null);
  const [huntClusterMembers, setHuntClusterMembers] = useState<PublicHouse[] | null>(null);
  const [huntLocation, setHuntLocation] = useState<UserLocation | null>(null);
  const [bootWebXrSession, setBootWebXrSession] = useState<XRSession | null>(null);
  const [simulate, setSimulate] = useState(adminSimulateInRange);
  const [gemCheer, setGemCheer] = useState(false);
  const [gemCheerPet, setGemCheerPet] = useState<GemMonsterId | null>(null);
  const cheerTimerRef = useRef<number | null>(null);
  const huntOpenGenRef = useRef(0);
  const [androidArReady, setAndroidArReady] = useState(false);

  useEffect(() => {
    if (!isAndroidLike()) return;
    void supportsWebXrHitTestAr().then(setAndroidArReady);
  }, []);

  useEffect(() => {
    return () => {
      if (cheerTimerRef.current != null) window.clearTimeout(cheerTimerRef.current);
    };
  }, []);

  const now = useAppNow();
  const {
    gemUiVisible: visible,
    gemAdminToolsVisible: showAdminTools,
    previewAsUser,
  } = useGemHuntAdminUi(isAdmin);
  const tellMeHuntRadiusEnforced = gemTellMeHuntRadiusEnforced(isAdmin, previewAsUser);
  const collected = gems.collected(house.id);
  const huntBandM = activeGemHuntMeters();
  const proximity = gemProximity(userLocation, house, collected);
  const distanceM = useMemo(() => {
    if (!userLocation) return null;
    return gemDistanceMeters(userLocation, house);
  }, [house, userLocation]);

  const openCamera = useCallback(async () => {
    const gen = ++huntOpenGenRef.current;
    getGemHuntPortalRoot();
    let xrSession: XRSession | null = null;
    if (isAndroidLike() && webXrHitTestArCached()) {
      xrSession = await requestGemHuntWebXrSession();
    }
    if (gen !== huntOpenGenRef.current) {
      void endGemHuntWebXrSession(xrSession);
      releaseGemHuntCamera();
      return;
    }
    setBootWebXrSession(xrSession);
    setHuntLocation(userLocation);
    const fresh = (await onOpenHunt?.()) ?? userLocation;
    if (gen !== huntOpenGenRef.current) {
      void endGemHuntWebXrSession(xrSession);
      releaseGemHuntCamera();
      return;
    }
    await prepareGemHuntSensors({
      requestCamera: !xrSession,
      requestOrientation: !isGemHuntOrientationGranted(),
    });
    if (gen !== huntOpenGenRef.current) {
      void endGemHuntWebXrSession(xrSession);
      releaseGemHuntCamera();
      return;
    }
    setHuntLocation(fresh ?? userLocation);
    setHuntClusterMembers(null);
    setHuntTargetHouse(house);
    setHuntOpen(true);
  }, [house, mapHousesForCelebrate, onOpenHunt, userLocation]);

  const huntHouse = huntTargetHouse ?? house;

  const huntClusterQueueUi = useMemo(() => {
    if (!huntClusterMembers || !huntTargetHouse) return undefined;
    return gemClusterQueueHeadline(huntTargetHouse, huntClusterMembers);
  }, [huntClusterMembers, huntTargetHouse]);

  const huntCanCollect = canCollectGem(
    userLocation,
    huntHouse,
    gems.collected(huntHouse.id),
    true,
    simulate,
  );

  if (!visible) return null;

  const canCollect = canCollectGem(userLocation, house, collected, true, simulate);
  const anchor = gemAnchorForHouse(house);
  const anchorCalibrated = Boolean(anchorOverrideMap[house.id]) || anchor.calibrated === true;

  function closeHunt() {
    huntOpenGenRef.current += 1;
    releaseGemHuntCamera();
    void endGemHuntWebXrSession(bootWebXrSession);
    setBootWebXrSession(null);
    setHuntOpen(false);
    setHuntTargetHouse(null);
    setHuntClusterMembers(null);
  }

  function onCollect(collectedVariant: GemMonsterId, options?: GemCollectFinishOptions) {
    const collectedBefore = loadGemCollected();
    const celebrate =
      options?.navigateStickerBook && mapHousesForCelebrate.length > 0
        ? gemBagCelebrateAfterCollect(
            mapHousesForCelebrate,
            collectedBefore,
            huntHouse.id,
            collectedVariant,
          )
        : null;
    gems.collect(huntHouse.id, collectedVariant);
    closeHunt();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(40);
    }
    if (options?.navigateStickerBook) {
      router.push(gemBagCollectHref(collectedVariant, celebrate));
      return;
    }
    if (options?.cheer !== false) {
      setGemCheerPet(collectedVariant);
      setGemCheer(true);
      if (cheerTimerRef.current != null) window.clearTimeout(cheerTimerRef.current);
      cheerTimerRef.current = window.setTimeout(() => {
        cheerTimerRef.current = null;
        setGemCheer(false);
        setGemCheerPet(null);
      }, GEM_CHEER_MS);
    }
  }

  return (
    <>
      <section className="gem-hunt-panel" dir="rtl">
        <GemHouseFoundHero house={house} collected={collected} className="gem-hunt-panel__found-hero" />

        {!collected ? (
          <p className="gem-hunt-panel__status">
            {canCollect
              ? "בטווח — אפשר למצוא"
              : proximity === "far" && distanceM != null && distanceM <= huntBandM + 10
                ? GEM_PANEL_NEAR_GPS_HE
                : proximity === "far"
                  ? gemPanelApproachHe(huntBandM)
                  : distanceM != null
                    ? gemPanelOpenCameraHe(Math.round(distanceM))
                    : "פתחו מצלמה לתצוגה"}
          </p>
        ) : null}

        {!collected &&
        userLocation &&
        distanceM != null &&
        distanceM <= 35 &&
        (proximity === "far" || proximity === "approach") ? (
          <div className="gem-hunt-panel__calibrate-public">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-emerald-400/45 text-emerald-100"
              onClick={() => setGemAnchorOverride(house.id, userLocation)}
            >
              <MapPin className="size-3.5" aria-hidden />
              {GEM_ANCHOR_UPDATE_PUBLIC_HE}
            </Button>
          </div>
        ) : null}

        {!collected && anchorOverrideMap[house.id] ? (
          <p className="gem-hunt-panel__override-hint">
            המיקום בטלפון שלכם דורס את המפה. אחרי עדכון אפל —{" "}
            <button
              type="button"
              className="gem-hunt-panel__override-reset"
              onClick={() => clearGemAnchorOverride(house.id)}
            >
              {GEM_ANCHOR_RESET_ONE_HE}
            </button>
          </p>
        ) : null}

        {showAdminTools ? (
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
                {anchorCalibrated ? GEM_ANCHOR_TITLE_CALIBRATED_HE : GEM_ANCHOR_TITLE_AUTO_HE}
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
                {GEM_ANCHOR_SET_GPS_HE}
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
              {calibratedCount > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-rose-300/95"
                  onClick={() => clearAllGemAnchorOverrides()}
                >
                  {GEM_ANCHOR_RESET_ALL_HE(calibratedCount)}
                </Button>
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
          {collected
            ? androidArReady
              ? "מפגש AR שוב"
              : "מפגש במצלמה"
            : canCollect
              ? androidArReady
                ? "התחילו מפגש AR"
                : "התחילו מפגש"
              : androidArReady
                ? "נסו מפגש (רחוק)"
                : "נסו מפגש (רחוק)"}
        </Button>
      </section>

      <GemCheer show={gemCheer} house={house} monsterId={gemCheerPet ?? undefined} />
      {huntOpen && huntTargetHouse ? (
        <GemHuntExperienceLazy
          house={huntTargetHouse}
          userLocation={huntLocation ?? userLocation}
          simulateInRange={simulate}
          deferCameraUntilInRange={false}
          collectEnabled={huntCanCollect}
          encounterMode={!huntClusterMembers}
          repeatVisit={gems.collected(huntTargetHouse.id)}
          tellMeHuntRadiusEnforced={tellMeHuntRadiusEnforced}
          initialWebXrSession={bootWebXrSession}
          campusQueue={huntClusterQueueUi}
          onCollectPersist={
            huntClusterMembers
              ? (monsterId) => {
                  gems.collect(huntTargetHouse.id, monsterId);
                }
              : undefined
          }
          onCampusStepComplete={
            huntClusterMembers
              ? () => {
                  const next = nextClusterGemHouse(
                    huntClusterMembers,
                    gems.collected,
                    huntTargetHouse.id,
                  );
                  if (next) {
                    setHuntTargetHouse(next);
                    return;
                  }
                  closeHunt();
                }
              : undefined
          }
          onClose={closeHunt}
          onCollect={onCollect}
        />
      ) : null}
    </>
  );
}
