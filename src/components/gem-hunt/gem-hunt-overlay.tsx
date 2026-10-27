"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GemHuntOrientationArrow } from "@/components/gem-hunt/gem-hunt-orientation-arrow";
import { GpsBearingDial } from "@/components/gem-hunt/gps-bearing-dial";
import { GemSprite } from "@/components/gem-hunt/gem-sprite";
import { OverlayCloseButton } from "@/components/overlay-close-button";
import { useDeviceHeading } from "@/hooks/use-device-heading";
import {
  getGemHuntCameraStream,
  isGemHuntOrientationGranted,
  prepareGemHuntSensors,
  requestGemHuntOrientationPermission,
  releaseGemHuntCamera,
  stopGemHuntCameraStream,
} from "@/lib/gem-hunt-sensors";
import { gemCollectDanceIndex } from "@/lib/gem-collect-dance";
import {
  facingHouse,
  GEM_FACING_TOLERANCE_DEG,
  GEM_HELP_AFTER_SECONDS,
  activeGemHuntMeters,
  bearingDegrees,
  gemDistanceMeters,
  GEM_SCAN_PAN_DEGREES,
  GEM_SCAN_REVEAL_SECONDS,
  gemTellMeCenterModelZoom,
  gemHuntOnsiteCenterModelZoom,
  gemHuntGemStayVisible,
  gemWalkNavTarget,
  withinGemHuntMeters,
  GEM_CAMPUS_COLLECT_MS,
  GEM_COLLECT_OVERLAY_MS,
  GEM_IN_CAMERA_ALBUM_REVEAL_ENABLED,
  type GemCampusQueueUi,
  gemAnchorForHouse,
  gemMonsterForHouse,
  gemScreenPlacement,
  gemWorldPinApproachVisible,
  gemWorldPinVisible,
  relativeWalkBearingDeg,
  type GemMonsterId,
  type GemCollectFinishOptions,
} from "@/lib/gem-hunt";
import type { PublicHouse } from "@/lib/types";
import { formatDistance } from "@/lib/geo";
import type { UserLocation } from "@/hooks/use-user-location";
import { beginMapListOverlayCapture, endMapListOverlayCapture } from "@/lib/map-list-suspend";
import { googleMapsNavigateUrl } from "@/lib/route";
import { isGemTypeInCollection, loadGemCollected } from "@/lib/gem-progress";
import { GemCollectAlbumReveal } from "@/components/gem-hunt/gem-collect-album-reveal";
import { useGemHuntLiveLocation } from "@/hooks/use-gem-hunt-live-location";
import { useSmoothedGemPlacement } from "@/hooks/use-smoothed-gem-placement";
import { gemWorldYawRad } from "@/lib/gem-world-yaw";
import { useGemAnchorOverrides } from "@/hooks/use-gem-anchor-overrides";
import { gemWalkGuideCopy } from "@/lib/gem-hunt-walk-guide";
import { GemEncounterLayer } from "@/components/gem-hunt/gem-encounter-layer";
import { GemHuntTellMeButton } from "@/components/gem-hunt/gem-hunt-tell-me-button";
import { useGemTellMeButton } from "@/hooks/use-gem-tell-me-button";
import { gemTellMeInRange } from "@/lib/gem-tell-me-gate";
import { useGemEncounterPhase } from "@/hooks/use-gem-encounter-phase";
import { useTreatSwipe } from "@/hooks/use-treat-swipe";
import {
  GEM_ENCOUNTER_CELEBRATE_MS,
  encounterUiChromeHidden,
  markEncounterTutorialSeen,
} from "@/lib/gem-encounter";
import { isAndroidLike, isIosLike } from "@/lib/gem-hunt-ar-platform";
import { getGemHuntPortalRoot } from "@/lib/gem-hunt-portal-root";
import { gemHuntFooterVisible } from "@/lib/gem-hunt-footer";
import { gemTapCollectReady } from "@/lib/gem-hunt-tap-collect";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import { useGemCopy } from "@/hooks/use-gem-copy";
import { HelpText } from "@/components/help-text";

type HuntPhase = "scanning" | "visible" | "collecting" | "albumReveal" | "done";

function panDelta(prev: number | null, next: number) {
  if (prev == null) return 0;
  let d = Math.abs(next - prev);
  if (d > 180) d = 360 - d;
  return d;
}

async function playCameraOnVideo(video: HTMLVideoElement, stream: MediaStream) {
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  try {
    await video.play();
    return true;
  } catch {
    /* iOS often needs loadedmetadata before play() */
  }
  await new Promise<void>((resolve) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) resolve();
    else video.addEventListener("loadeddata", () => resolve(), { once: true });
  });
  try {
    await video.play();
    return true;
  } catch {
    return false;
  }
}

export function GemHuntOverlay({
  house,
  userLocation,
  simulateInRange = false,
  collectEnabled = true,
  encounterMode = true,
  repeatVisit = false,
  tellMeHuntRadiusEnforced = true,
  onBeforeNavigationAssist,
  onClose,
  onCollect,
  campusQueue,
  onCollectPersist,
  onCampusStepComplete,
  onClusterFinishSession,
  onClusterSkipHouse,
  clusterSkipAvailable = false,
  clusterFinishAvailable = false,
}: {
  house: PublicHouse;
  userLocation: UserLocation | null;
  simulateInRange?: boolean;
  /** @deprecated Camera always starts immediately; kept for call-site compatibility. */
  deferCameraUntilInRange?: boolean;
  /** When false, user can scan and see the gem but cannot collect (preview / too far). */
  collectEnabled?: boolean;
  /** PoGo-style phased encounter (transition → approach → swipe collect). */
  encounterMode?: boolean;
  /** House pet already in sticker book — shorter resolve + repeat reward. */
  repeatVisit?: boolean;
  tellMeHuntRadiusEnforced?: boolean;
  /** Re-target closest gem before tell-me / hint (map roving hunt). */
  onBeforeNavigationAssist?: () => void;
  campusQueue?: GemCampusQueueUi;
  onCollectPersist?: (monsterId: GemMonsterId) => void;
  onCampusStepComplete?: (monsterId: GemMonsterId) => void;
  /** Multi-house session — end early and show summary. */
  onClusterFinishSession?: () => void;
  onClusterSkipHouse?: () => void;
  clusterSkipAvailable?: boolean;
  clusterFinishAvailable?: boolean;
  onClose: () => void;
  onCollect: (monsterId: GemMonsterId, options?: GemCollectFinishOptions) => void;
}) {
  const { dir, locale, t } = useLocale();
  const gemCopy = useGemCopy();
  const campusSession = Boolean(campusQueue && onCampusStepComplete && onCollectPersist);
  const sim = simulateInRange;
  const monsterId = gemMonsterForHouse(house);
  const collectDanceIndex = useMemo(
    () => gemCollectDanceIndex(house.id, monsterId),
    [house.id, monsterId],
  );
  const { overrides: anchorOverrides } = useGemAnchorOverrides();
  const anchor = useMemo(
    () => gemAnchorForHouse(house),
    [house.id, house.lat, house.lng, anchorOverrides],
  );
  /** Admin simulate: GPS at the house pin (ground); hunt uses anchor offset + compass like on-site. */
  const effectiveLoc = useMemo(() => {
    if (sim) return { lat: house.lat, lng: house.lng, accuracy: 5 };
    return userLocation;
  }, [sim, house.lat, house.lng, userLocation]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraRetry, setCameraRetry] = useState(0);
  const cameraBootRef = useRef(false);
  /** Prevents async getUserMedia from re-attaching after the user closes the hunt. */
  const huntClosingRef = useRef(false);
  /** True once user starts collect or enters encounter in band — avoids GPS flicker blocking finish. */
  const encounterCollectLatchedRef = useRef(false);
  /** Latched at collect tap — keep center vs pinned layout through the dance if GPS drifts. */
  const collectGemCenterRef = useRef(true);
  const foundDistanceMRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<HuntPhase>("scanning");
  const [, setHint] = useState<"scan" | "warm" | "found" | "help">("scan");
  const [, setShowHelp] = useState(false);
  const [hintPanel, setHintPanel] = useState<null | "nav">(null);
  /** User chose **גלה לי** — centered gem on the camera (not orbit hint box). */
  const [centerReveal, setCenterReveal] = useState(false);
  /** User tapped **הסתר** or opened **רמז** after center — do not keep encounter/tell-me center lock. */
  const [userDismissedCenterGem, setUserDismissedCenterGem] = useState(false);
  const gemTapStartRef = useRef<{ x: number; y: number } | null>(null);
  const scanStartRef = useRef(0);
  useEffect(() => {
    scanStartRef.current = Date.now();
  }, [house.id]);
  const panTotalRef = useRef(0);
  const lastHeadingRef = useRef<number | null>(null);
  const facingSinceRef = useRef<number | null>(null);
  const revealedRef = useRef(false);
  const collectFinishRef = useRef<number | null>(null);
  const onCollectRef = useRef(onCollect);
  onCollectRef.current = onCollect;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onCollectPersistRef = useRef(onCollectPersist);
  onCollectPersistRef.current = onCollectPersist;
  const onCampusStepCompleteRef = useRef(onCampusStepComplete);
  onCampusStepCompleteRef.current = onCampusStepComplete;
  const [albumRevealPhase, setAlbumRevealPhase] = useState<"enter" | "landed">("enter");
  /** Snapshot at tap — album sticker was new before this collect. */
  const [albumRevealNewFriend, setAlbumRevealNewFriend] = useState(true);
  /** Latched when `house.id` changes — avoid flip to repeat mid-cluster after persist. */
  const [repeatVisitLatched, setRepeatVisitLatched] = useState(repeatVisit);
  const [isNewGemTypeLatched, setIsNewGemTypeLatched] = useState(true);
  const [albumShowActions, setAlbumShowActions] = useState(false);
  const [compassRetry, setCompassRetry] = useState(0);
  const [platformMod, setPlatformMod] = useState<"gem-hunt-overlay--android" | "gem-hunt-overlay--ios" | null>(
    null,
  );

  useEffect(() => {
    if (isAndroidLike()) setPlatformMod("gem-hunt-overlay--android");
    else if (isIosLike()) setPlatformMod("gem-hunt-overlay--ios");
  }, []);

  useEffect(() => {
    setCenterReveal(false);
    setUserDismissedCenterGem(false);
    setHintPanel(null);
    setRepeatVisitLatched(repeatVisit);
    const entries = loadGemCollected();
    setIsNewGemTypeLatched(!repeatVisit && !isGemTypeInCollection(monsterId, entries));
    // Latch per house — ignore repeatVisit flipping after in-session collect (cluster queue).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- monsterId/repeatVisit are for this house.id
  }, [house.id]);

  const { heading, pitch: devicePitch, status: headingStatus } = useDeviceHeading(true, compassRetry);

  /** Live GPS for distance, hints, and in-range — not the snapshot from hunt open. */
  const liveLoc = useGemHuntLiveLocation({
    huntGpsEnabled: true,
    simulate: sim,
    simulateLoc: { lat: house.lat, lng: house.lng, accuracy: 5 },
    seedLoc: userLocation,
  });

  const walkViewer =
    sim || !liveLoc
      ? null
      : { lat: liveLoc.lat, lng: liveLoc.lng, accuracy: liveLoc.accuracy ?? 12 };

  const distanceM =
    liveLoc != null && !sim ? gemDistanceMeters(liveLoc, house) : null;
  const huntBandM = activeGemHuntMeters();
  const inDistanceBand =
    liveLoc != null && !sim && withinGemHuntMeters(liveLoc, anchor, huntBandM);
  const tellMeInRange = gemTellMeInRange(liveLoc ?? effectiveLoc, house, sim);

  /** Freshest GPS for AR pin — keeps the gem on the sidewalk anchor, not on the user. */
  const placementLoc = walkViewer ?? effectiveLoc;

  const worldYawRad = useMemo(() => {
    if (!walkViewer || sim) return null;
    return gemWorldYawRad(anchor, walkViewer);
  }, [anchor.lat, anchor.lng, walkViewer?.lat, walkViewer?.lng, sim]);

  const pinPlacement = useMemo(() => {
    if (!placementLoc) return null;
    return gemScreenPlacement(placementLoc, anchor, heading, devicePitch);
  }, [anchor, placementLoc, heading, devicePitch]);
  const pinDisplay = useSmoothedGemPlacement(pinPlacement, house.id);
  const worldPinPlacementEarly = pinDisplay ?? pinPlacement;
  const canCollectNow = collectEnabled || sim || inDistanceBand;
  const inGemStayVisibleBand =
    sim ||
    phase === "collecting" ||
    gemHuntGemStayVisible(distanceM, foundDistanceMRef.current, inDistanceBand);
  /** Scan/pan/facing reveal when in range (or admin simulate). */
  const allowAutoReveal = canCollectNow;

  const reveal = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    if (distanceM != null && !sim) {
      foundDistanceMRef.current = distanceM;
    }
    setPhase("visible");
    setHint("found");
    setHintPanel(null);
  }, [distanceM, sim]);

  /** In range: skip 5s scan wait so footer + **גלה לי** work immediately. */
  useEffect(() => {
    if (!allowAutoReveal) return;
    reveal();
  }, [allowAutoReveal, house.id, reveal]);

  useEffect(() => {
    scanStartRef.current = Date.now();
    panTotalRef.current = 0;
    lastHeadingRef.current = heading;
    facingSinceRef.current = null;
    revealedRef.current = false;
    foundDistanceMRef.current = null;
    collectGemCenterRef.current = true;
    setPhase("scanning");
    setHint("scan");
    setShowHelp(false);
    setHintPanel(null);
    setCenterReveal(false);
    setAlbumRevealPhase("enter");
    if (collectFinishRef.current != null) {
      window.clearTimeout(collectFinishRef.current);
      collectFinishRef.current = null;
    }
  }, [house.id]);

  useEffect(() => {
    huntClosingRef.current = false;
    encounterCollectLatchedRef.current = false;
  }, [house.id]);

  useEffect(() => {
    if (!campusSession) return;
    if (phase === "collecting") return;
    if (!canCollectNow && !sim) return;
    reveal();
    setCenterReveal(true);
    encounterCollectLatchedRef.current = true;
  }, [campusSession, house.id, canCollectNow, sim, phase, reveal]);

  useEffect(() => {
    beginMapListOverlayCapture();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      huntClosingRef.current = true;
      document.body.style.overflow = prev;
      releaseGemHuntCamera(videoRef.current);
      stopGemHuntCameraStream();
      endMapListOverlayCapture();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function attachCamera() {
      let stream = getGemHuntCameraStream();
      const videoEarly = videoRef.current;
      if (stream && videoEarly && !videoEarly.srcObject) {
        videoEarly.srcObject = stream;
        videoEarly.muted = true;
        videoEarly.playsInline = true;
        void videoEarly.play().catch(() => {});
      }
      if (!stream && !cameraBootRef.current) {
        cameraBootRef.current = true;
        const prepared = await prepareGemHuntSensors({
          requestCamera: true,
          requestOrientation: !isGemHuntOrientationGranted(),
        });
        cameraBootRef.current = false;
        if (cancelled || huntClosingRef.current) return;
        if (!prepared.camera) {
          setCameraError("no-camera");
          return;
        }
        stream = getGemHuntCameraStream();
      }
      if (!stream) {
        setCameraError("no-camera");
        return;
      }
      if (cancelled || huntClosingRef.current) return;
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      const ok = await playCameraOnVideo(video, stream);
      if (cancelled || huntClosingRef.current) {
        releaseGemHuntCamera(video);
        return;
      }
      if (ok) setCameraError(null);
      else setCameraError("לא ניתן להציג מצלמה");
    }

    void attachCamera();
    return () => {
      cancelled = true;
      streamRef.current = null;
    };
  }, [cameraRetry, sim]);

  useEffect(() => {
    if (phase !== "scanning" || revealedRef.current) return;

    const locEarly = liveLoc;
    const facingClose =
      locEarly != null &&
      heading != null &&
      facingHouse(locEarly, anchor, heading, GEM_FACING_TOLERANCE_DEG);
    if (!sim && allowAutoReveal && distanceM != null && distanceM <= 3 && facingClose) {
      reveal();
      return;
    }

    if (heading != null) {
      panTotalRef.current += panDelta(lastHeadingRef.current, heading);
      lastHeadingRef.current = heading;
    }

    const elapsedSec = (Date.now() - scanStartRef.current) / 1000;
    if (elapsedSec >= GEM_HELP_AFTER_SECONDS) {
      setShowHelp(true);
    }

    if (!allowAutoReveal) return;

    const loc = liveLoc;
    const facing =
      loc != null &&
      heading != null &&
      facingHouse(loc, anchor, heading, GEM_FACING_TOLERANCE_DEG);

    if (facing) {
      if (facingSinceRef.current == null) facingSinceRef.current = Date.now();
      setHint("warm");
      if (Date.now() - (facingSinceRef.current ?? 0) >= 800) {
        reveal();
        return;
      }
    } else {
      facingSinceRef.current = null;
      setHint("scan");
    }

    if (
      !sim &&
      (elapsedSec >= GEM_SCAN_REVEAL_SECONDS || panTotalRef.current >= GEM_SCAN_PAN_DEGREES)
    ) {
      reveal();
    }
  }, [anchor, liveLoc, heading, house, phase, reveal, sim, allowAutoReveal, distanceM]);

  const handleCollect = useCallback(() => {
    if (phase !== "visible") return;
    const inCollectBand =
      canCollectNow || encounterCollectLatchedRef.current || sim;
    const tellMeReady = centerReveal;
    const viaTellMe = tellMeReady && !encounterMode;
    const viaTellMeEncounter = tellMeReady && encounterMode;
    const viaPinned =
      !centerReveal && inCollectBand && gemWorldPinVisible(pinDisplay ?? pinPlacement);
    const viaEncounter = encounterMode && inCollectBand;
    const viaCampus = campusSession && (inCollectBand || centerReveal);
    if (!viaTellMe && !viaTellMeEncounter && !viaPinned && !viaEncounter && !viaCampus) return;
    collectGemCenterRef.current =
      centerReveal || campusSession || viaTellMe || viaTellMeEncounter || !viaPinned;
    if (distanceM != null && !sim && foundDistanceMRef.current == null) {
      foundDistanceMRef.current = distanceM;
    }
    const entries = loadGemCollected();
    const newAlbumFriend = !repeatVisitLatched && !isGemTypeInCollection(monsterId, entries);
    onCollectPersistRef.current?.(monsterId);
    if (!campusSession && newAlbumFriend) {
      releaseGemHuntCamera(videoRef.current);
    }
    setPhase("collecting");
    setHint("found");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([20, 40, 60]);
    }
    if (collectFinishRef.current != null) window.clearTimeout(collectFinishRef.current);
    setAlbumRevealNewFriend(campusSession ? true : newAlbumFriend);
    const overlayMs = campusSession
      ? GEM_CAMPUS_COLLECT_MS
      : GEM_COLLECT_OVERLAY_MS;
    collectFinishRef.current = window.setTimeout(() => {
      collectFinishRef.current = null;
      if (campusSession) {
        onCampusStepCompleteRef.current?.(monsterId);
        return;
      }
      huntClosingRef.current = true;
      releaseGemHuntCamera(videoRef.current);
      if (newAlbumFriend) {
        if (GEM_IN_CAMERA_ALBUM_REVEAL_ENABLED) {
          setAlbumRevealPhase("enter");
          setPhase("albumReveal");
          return;
        }
        onCollectRef.current(monsterId, { cheer: false, navigateStickerBook: true });
        onCloseRef.current();
        return;
      }
      onCollectRef.current(monsterId, { cheer: true });
      onCloseRef.current();
    }, overlayMs);
  }, [
    campusSession,
    centerReveal,
    canCollectNow,
    distanceM,
    encounterMode,
    monsterId,
    phase,
    pinDisplay,
    pinPlacement,
    repeatVisitLatched,
    sim,
    tellMeInRange,
  ]);

  const finishRepeatEncounter = useCallback(() => {
    if (campusSession) return;
    releaseGemHuntCamera(videoRef.current);
    onClose();
  }, [campusSession, onClose]);

  const encounterRepeatVisit = campusSession ? false : repeatVisitLatched;

  const petRevealedForEncounter = phase === "visible" || phase === "collecting";
  const inRangeForEncounter = canCollectNow;

  const {
    encounterPhase,
    setEncounterPhase,
    onTreatSuccess,
    onTreatMiss,
  } = useGemEncounterPhase({
    enabled: encounterMode,
    sessionKey: house.id,
    repeatVisit: encounterRepeatVisit,
    collectEnabled: canCollectNow,
    petRevealed: petRevealedForEncounter,
    inRange: inRangeForEncounter,
    onEncounterCollect: handleCollect,
    onRepeatRewardDone: finishRepeatEncounter,
  });

  const treatSwipe = useTreatSwipe({
    onSuccess: () => {
      markEncounterTutorialSeen();
      onTreatSuccess();
    },
    onMiss: onTreatMiss,
  });

  useEffect(() => {
    if (!encounterMode || encounterPhase !== "encounter") return;
    reveal();
  }, [encounterMode, encounterPhase, reveal]);

  useEffect(() => {
    if (encounterMode && encounterPhase === "encounter" && (canCollectNow || sim)) {
      encounterCollectLatchedRef.current = true;
    }
  }, [encounterMode, encounterPhase, canCollectNow, sim]);

  /** **גלה לי** during approach: enable swipe-treat fallback and tap-collect (skip approach wait). */
  useEffect(() => {
    if (!encounterMode || !centerReveal || userDismissedCenterGem || encounterPhase !== "approach")
      return;
    setEncounterPhase("encounter");
  }, [encounterMode, centerReveal, userDismissedCenterGem, encounterPhase, setEncounterPhase]);

  useEffect(() => {
    if (phase !== "albumReveal") return;
    releaseGemHuntCamera(videoRef.current);
    setAlbumShowActions(false);
    setAlbumRevealPhase("enter");
    const landTimer = window.setTimeout(() => setAlbumRevealPhase("landed"), 720);
    const actionsTimer = window.setTimeout(() => setAlbumShowActions(true), 880);
    return () => {
      window.clearTimeout(landTimer);
      window.clearTimeout(actionsTimer);
    };
  }, [phase, monsterId]);

  function finishNewFriendClose() {
    huntClosingRef.current = true;
    releaseGemHuntCamera(videoRef.current);
    onCollectRef.current(monsterId, { cheer: true });
    onCloseRef.current();
  }

  function finishNewFriendStickerBook() {
    huntClosingRef.current = true;
    releaseGemHuntCamera(videoRef.current);
    onCollectRef.current(monsterId, { cheer: false, navigateStickerBook: true });
    onCloseRef.current();
  }

  const activateTellMe = useCallback(() => {
    onBeforeNavigationAssist?.();
    setUserDismissedCenterGem(false);
    setHintPanel(null);
    if (!revealedRef.current) reveal();
    setShowHelp(false);
    setHint("found");
    setCenterReveal(true);
  }, [onBeforeNavigationAssist, reveal]);

  const deactivateTellMe = useCallback(() => {
    if (campusSession) return;
    setCenterReveal(false);
    setUserDismissedCenterGem(true);
    if (encounterMode && encounterPhase === "encounter") {
      setEncounterPhase("approach");
    }
  }, [campusSession, encounterMode, encounterPhase, setEncounterPhase]);

  const gemVisible = phase === "visible" || phase === "collecting";
  const showHuntUi = phase !== "albumReveal";
  const inOnsiteBand = sim || canCollectNow;
  const gemVisibleBand = inGemStayVisibleBand;
  const foundOnScreenBanner = gemCopy.foundOnScreenBanner(
    repeatVisitLatched,
    gemCopy.petLabel(monsterId),
    isNewGemTypeLatched,
  );

  function handleClose() {
    if (phase === "collecting" && !campusSession) return;
    if (phase === "albumReveal") {
      if (albumShowActions || albumRevealPhase === "landed") finishNewFriendClose();
      return;
    }
    huntClosingRef.current = true;
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.style.visibility = "hidden";
      video.style.pointerEvents = "none";
    }
    releaseGemHuntCamera(video);
    stopGemHuntCameraStream();
    onClose();
  }

  const walkNavTarget = gemWalkNavTarget(house);
  const turnBearing =
    liveLoc != null ? relativeWalkBearingDeg(liveLoc, walkNavTarget, heading) : null;
  const facingTarget =
    turnBearing != null && Math.abs(turnBearing) <= GEM_FACING_TOLERANCE_DEG;
  /** Real hunt: compass-pinned gem when not in **גלה לי** center mode. */
  const arPinGuideMode = gemVisible && !centerReveal;
  const pinCollectReady =
    arPinGuideMode && canCollectNow && gemWorldPinVisible(pinDisplay ?? pinPlacement, huntBandM);
  /** Show centered gem after reveal even before **stand still** — tap only when collectEnabled. */
  /** Show when anchor bearing is in the camera cone — gated by activeGemHuntMeters(). */
  const encounterForcesCenter =
    gemVisibleBand &&
    !userDismissedCenterGem &&
    encounterMode &&
    (encounterPhase === "encounter" ||
      encounterPhase.startsWith("resolve") ||
      encounterPhase === "reward");
  const gemAtCenter =
    !userDismissedCenterGem &&
    (phase === "collecting"
      ? collectGemCenterRef.current
      : (centerReveal && gemVisible) ||
        (gemVisibleBand &&
          (encounterForcesCenter ||
            (encounterMode &&
              (encounterPhase === "approach" || encounterPhase === "encounter")) ||
            (!encounterMode && gemVisible) ||
            (campusSession && (canCollectNow || sim)))));
  const worldPinPlacement = worldPinPlacementEarly;
  const showWorldGemSprite =
    phase === "collecting"
      ? !collectGemCenterRef.current
      : !gemAtCenter &&
        worldPinPlacement != null &&
        (gemWorldPinVisible(worldPinPlacement, huntBandM) ||
          gemWorldPinApproachVisible(worldPinPlacement));
  const worldLockRevealed =
    arPinGuideMode && showWorldGemSprite && (phase === "visible" || phase === "collecting");
  const isFarForHints =
    !canCollectNow &&
    !sim &&
    liveLoc != null &&
    distanceM != null &&
    distanceM > huntBandM &&
    phase !== "collecting" &&
    !centerReveal;
  const gpsBearingToNav =
    liveLoc != null ? bearingDegrees(liveLoc, walkNavTarget) : null;
  /** Glowing Navigation arrow — phone-relative when compass works, else map-north bearing. */
  const huntArrowPhoneRelative = heading != null && turnBearing != null;
  const navTurnBearing = turnBearing;
  const huntArrowDeg = huntArrowPhoneRelative ? navTurnBearing : gpsBearingToNav;
  const huntArrowMapNorth = !huntArrowPhoneRelative && gpsBearingToNav != null;
  const mapsWalkUrl =
    liveLoc != null && !sim
      ? googleMapsNavigateUrl(liveLoc, { lat: walkNavTarget.lat, lng: walkNavTarget.lng })
      : null;
  const walkGuideCopy = gemWalkGuideCopy(
    locale,
    huntArrowPhoneRelative,
    facingTarget,
    navTurnBearing,
    gpsBearingToNav,
  );
  const showCompassEnable =
    huntArrowMapNorth &&
    (headingStatus === "denied" || headingStatus === "unsupported");
  const showNavCompassPrompt =
    hintPanel === "nav" &&
    !centerReveal &&
    !isFarForHints &&
    (showCompassEnable ||
      headingStatus === "denied" ||
      headingStatus === "idle" ||
      heading == null);
  const gemTapCollectEnabled = gemTapCollectReady({
    phase,
    gemAtCenter,
    centerReveal,
    campusSession,
    encounterMode,
    encounterPhase,
    canCollectNow,
    simulate: sim,
    pinCollectReady,
  });

  const canTapCollect = gemTapCollectEnabled;

  const offerEncounterCollect = useCallback(() => {
    if (encounterPhase !== "encounter") return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([12, 28, 18]);
    }
    encounterCollectLatchedRef.current = true;
    markEncounterTutorialSeen();
    onTreatSuccess();
  }, [encounterPhase, onTreatSuccess, centerReveal]);

  const handleGemInspectTap = useCallback(() => {
    if (encounterMode && encounterPhase === "encounter" && gemAtCenter) {
      if (centerReveal || repeatVisitLatched) {
        handleCollect();
        return;
      }
      offerEncounterCollect();
      return;
    }
    if (canTapCollect) handleCollect();
  }, [
    centerReveal,
    encounterMode,
    encounterPhase,
    gemAtCenter,
    offerEncounterCollect,
    canTapCollect,
    handleCollect,
    repeatVisitLatched,
  ]);

  const navHintOpen = hintPanel === "nav";
  const showHuntGem = gemVisible && (gemAtCenter || showWorldGemSprite);
  const gemRenderedForStopFrame =
    showHuntGem &&
    (gemAtCenter ||
      (showWorldGemSprite && (pinDisplay ?? pinPlacement)?.inView === true));
  const naturalDiscoverActive =
    !centerReveal &&
    canCollectNow &&
    phase === "visible" &&
    gemVisibleBand &&
    gemRenderedForStopFrame;
  const hideHuntHintControls =
    !centerReveal && !campusSession && naturalDiscoverActive && !navHintOpen;

  const tellMeButton = useGemTellMeButton({
    enforceHuntRadius: tellMeHuntRadiusEnforced,
    inRange: tellMeInRange,
    centerReveal,
    naturalDiscoverActive,
    blocked: phase === "collecting",
    onActivate: activateTellMe,
    onDeactivate: deactivateTellMe,
  });

  const gemFoundInView =
    showHuntGem &&
    phase === "visible" &&
    gemVisibleBand &&
    (centerReveal && gemAtCenter
      ? true
      : encounterMode
        ? encounterPhase === "encounter" && gemAtCenter
        : gemAtCenter || pinCollectReady);
  const showWalkNavGuide = navHintOpen;
  const showNavCompass =
    navHintOpen &&
    !centerReveal &&
    huntArrowDeg != null &&
    liveLoc != null &&
    !sim &&
    (encounterMode
      ? encounterPhase === "approach" || encounterPhase === "encounter"
      : true);
  const showFoundOnScreenBanner = phase === "collecting";

  const gemEncounterWiggle =
    encounterPhase === "resolve-hit" ||
    encounterPhase === "resolve-wiggle1" ||
    encounterPhase === "resolve-wiggle2" ||
    encounterPhase === "resolve-breakout";
  const gemMotion =
    phase === "collecting" || encounterPhase === "resolve-celebrate"
      ? "celebrate"
      : "idle";

  const showEncounterFooter =
    encounterMode &&
    (encounterPhase === "approach" || encounterPhase === "encounter") &&
    phase !== "collecting";
  const showLegacyFooter = gemHuntFooterVisible({
    phase,
    encounterMode,
    encounterPhase,
    centerReveal,
    campusSession,
  });
  const hideFooterChrome =
    encounterMode && encounterUiChromeHidden(encounterPhase);

  async function retryCompassPermission() {
    const ok = await requestGemHuntOrientationPermission({ force: true });
    if (ok) setCompassRetry((n) => n + 1);
  }

  const toggleHintPanel = useCallback(async () => {
    if (hintPanel === "nav") {
      setHintPanel(null);
      return;
    }
    onBeforeNavigationAssist?.();
    if (!inOnsiteBand && (centerReveal || gemAtCenter)) {
      setUserDismissedCenterGem(true);
      if (encounterMode && encounterPhase === "encounter") {
        setEncounterPhase("approach");
      }
      setCenterReveal(false);
    }
    const ok = await requestGemHuntOrientationPermission({ force: true });
    if (ok) setCompassRetry((n) => n + 1);
    setHintPanel("nav");
  }, [
    hintPanel,
    centerReveal,
    gemAtCenter,
    encounterMode,
    encounterPhase,
    inOnsiteBand,
    onBeforeNavigationAssist,
    setEncounterPhase,
  ]);

  useEffect(() => {
    if (sim || canCollectNow || centerReveal) return;
    setCenterReveal(false);
  }, [canCollectNow, sim, centerReveal]);

  function retryCamera() {
    setCameraError(null);
    setCameraRetry((n) => n + 1);
  }

  const overlay = (
    <div
      className={cn(
        "gem-hunt-overlay",
        platformMod,
        encounterMode && "is-encounter-mode",
        campusSession && "is-campus-queue",
        (centerReveal || campusSession) && "is-tell-me-active",
        naturalDiscoverActive && "is-at-gem-stop",
      )}
      dir={dir}
    >
      {naturalDiscoverActive ? (
        <p className="gem-hunt-overlay__at-stop-badge" role="status">
          {t("gem.atStopDiscover")}
        </p>
      ) : null}
      <video
        ref={videoRef}
        className={cn(
          "gem-hunt-overlay__video",
          cameraError && "gem-hunt-overlay__video--behind-fallback",
          phase === "albumReveal" && "gem-hunt-overlay__video--off",
        )}
        playsInline
        muted
        autoPlay
      />
      {cameraError ? (
        <div className="gem-hunt-overlay__camera-banner" role="status">
          <p className="gem-hunt-overlay__camera-banner-title">{t("gem.noCameraTitle")}</p>
          <p className="gem-hunt-overlay__camera-banner-text">
            <HelpText>{t("gem.noCameraBody")}</HelpText>
          </p>
          <button type="button" className="gem-hunt-overlay__fallback-btn" onClick={() => void retryCamera()}>
            {t("gem.retryCamera")}
          </button>
        </div>
      ) : null}
      <div className="gem-hunt-overlay__shade" aria-hidden />
      {encounterMode ? (
        <GemEncounterLayer
          house={house}
          phase={encounterPhase}
          distanceM={distanceM}
          inRange={inRangeForEncounter}
          repeatVisit={repeatVisit}
          hideApproachLine={hintPanel === "nav" || centerReveal}
          showTutorial={encounterPhase === "encounter"}
        />
      ) : null}

      <header
        className={cn(
          "gem-hunt-overlay__header",
          campusQueue ? "gem-hunt-overlay__header--title" : "gem-hunt-overlay__header--close-only",
        )}
        dir={campusQueue ? dir : "ltr"}
      >
        {campusQueue ? (
          <div className="gem-hunt-overlay__header-text pointer-events-none" dir={dir}>
            <p className="gem-hunt-overlay__title--hero text-orange-50">{campusQueue.boothTitle}</p>
            {campusQueue.boothSubtitle ? (
              <p className="mt-0.5 text-sm font-semibold text-amber-200/95">{campusQueue.boothSubtitle}</p>
            ) : null}
          </div>
        ) : null}
        <OverlayCloseButton
          label={t("common.close")}
          onClick={handleClose}
          className={cn(
            "gem-hunt-overlay__close pointer-events-auto",
            !campusSession &&
              (phase === "collecting" ||
                (phase === "albumReveal" && albumRevealPhase === "enter" && !albumShowActions)) &&
              "pointer-events-none opacity-40",
          )}
        />
      </header>

      {phase === "collecting" ? (
        <div className="gem-hunt-overlay__collect-flash" aria-hidden />
      ) : null}
      {phase === "collecting" && showFoundOnScreenBanner ? (
        <p
          className="gem-hunt-overlay__found-again-banner gem-hunt-overlay__found-again-banner--collect is-exploding"
          role="status"
        >
          {foundOnScreenBanner}
        </p>
      ) : null}

      {showHuntUi ? (
      <div
        className={cn(
          "gem-hunt-overlay__stage",
          showHuntGem && "is-gem-interactive",
        )}
        aria-hidden={false}
      >
        {showNavCompass ? (
          <div className="gem-hunt-overlay__nav-layer" aria-hidden>
            {huntArrowMapNorth && gpsBearingToNav != null ? (
              <GpsBearingDial
                bearingDeg={gpsBearingToNav}
                distanceM={distanceM}
                compact
                className="gem-hunt-overlay__nav-dial"
              />
            ) : (
              <GemHuntOrientationArrow
                bearingDeg={huntArrowDeg!}
                facing={facingTarget}
                mapNorth={false}
              />
            )}
          </div>
        ) : null}

        {showHuntGem ? (
          <div
            className={cn(
              "gem-hunt-overlay__gem-hit gem-hunt-overlay__gem-pin is-pin-collect is-revealed",
              "is-inspect360",
              gemAtCenter ? "is-ring-center is-center-collect" : "is-pinned is-revealed",
              centerReveal && gemAtCenter && "is-tell-me-center",
              !gemAtCenter && worldLockRevealed && pinPlacement && !pinPlacement.inView && "is-off-screen",
              phase === "collecting" && "is-collecting",
              !gemAtCenter && pinCollectReady && "is-collect-ready-gem",
              !canCollectNow && phase === "visible" && "is-awaiting-still",
              gemTapCollectEnabled && "is-tap-collect-ready",
              (centerReveal || campusSession) &&
                gemAtCenter &&
                "is-tell-me-center-active",
            )}
            style={
              gemAtCenter || !pinDisplay
                ? undefined
                : {
                    left: `${pinDisplay.xPercent}%`,
                    top: `${pinDisplay.yPercent}%`,
                  }
            }
          >
            <div
              className={cn(
                "gem-hunt-overlay__gem-dance",
                phase === "collecting" && "is-collecting is-collecting-3d",
                gemEncounterWiggle && "is-encounter-wiggle",
              )}
              data-collect-dance={collectDanceIndex}
            >
              <GemSprite
                house={house}
                mode="inspect360"
                size="fill"
                tapCollect={false}
                spinWhileCollect={false}
                worldYawRad={gemAtCenter ? null : worldYawRad}
                motion={gemMotion}
                zoom={
                  gemAtCenter
                    ? centerReveal
                      ? gemTellMeCenterModelZoom()
                      : gemHuntOnsiteCenterModelZoom()
                    : 1
                }
                celebrateVariant={collectDanceIndex}
                onInspectTap={handleGemInspectTap}
              />
            </div>
          </div>
        ) : null}
      </div>
      ) : null}

      {encounterPhase === "encounter" &&
      !centerReveal &&
      phase !== "collecting" &&
      gemRenderedForStopFrame &&
      !navHintOpen ? (
        <div
          className="gem-hunt-overlay__encounter-swipe-zone"
          aria-hidden
          onPointerDown={treatSwipe.onPointerDown}
          onPointerUp={treatSwipe.onPointerUp}
          onPointerCancel={treatSwipe.onPointerCancel}
        />
      ) : null}

      {showHuntUi && phase !== "collecting" && showLegacyFooter && !hideFooterChrome ? (
        <footer className="gem-hunt-overlay__footer gem-hunt-overlay__footer--hunt" dir={dir}>
          <div className="gem-hunt-overlay__footer-stack">
            <div className="gem-hunt-overlay__footer-hint-slot">
              {tellMeButton.showRangeError ? (
                <p
                  className="gem-hunt-overlay__footer-hint gem-hunt-overlay__footer-hint--plain gem-hunt-overlay__footer-hint--error"
                  role="alert"
                >
                  {tellMeButton.rangeErrorMessage}
                </p>
              ) : null}
              {showNavCompassPrompt && !encounterMode ? (
                <button
                  type="button"
                  className="gem-hunt-overlay__hint-btn gem-hunt-overlay__hint-btn--compact w-full"
                  onClick={() => void retryCompassPermission()}
                >
                  {t("gem.compassSafari")}
                </button>
              ) : null}
              {showWalkNavGuide ? (
                <div
                  className="gem-hunt-overlay__walk-guide gem-hunt-overlay__walk-guide--hint gem-hunt-overlay__walk-guide--footer"
                  role="region"
                  aria-label={t("gem.walkMapsAria")}
                >
                  <p className="gem-hunt-overlay__walk-text">
                    {walkGuideCopy}
                    {distanceM != null ? ` · ${formatDistance(distanceM, locale)}` : null}
                  </p>
                  {mapsWalkUrl ? (
                    <a
                      href={mapsWalkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gem-hunt-overlay__walk-maps"
                    >
                      {t("gem.walkMapsLink")}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="gem-hunt-overlay__footer-controls">
                {!hideHuntHintControls ? (
                  <div className="gem-hunt-overlay__hint-actions gem-hunt-overlay__hint-actions--row">
                    <button
                      type="button"
                      className={cn(
                        "gem-hunt-overlay__hint-btn gem-hunt-overlay__hint-btn--compact",
                        hintPanel === "nav" && "is-active",
                      )}
                      aria-pressed={hintPanel === "nav"}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleHintPanel();
                      }}
                    >
                      <span className="gem-hunt-overlay__hint-btn-label">
                        <span className="gem-hunt-overlay__hint-btn-title">{t("gem.hintTitle")}</span>
                        <span className="gem-hunt-overlay__hint-btn-sub">{t("gem.hintSub")}</span>
                      </span>
                    </button>
                    {!encounterMode || showEncounterFooter ? (
                      <GemHuntTellMeButton
                        centerReveal={centerReveal}
                        readyHighlight={tellMeButton.readyHighlight}
                        onClick={(e) => {
                          e.stopPropagation();
                          tellMeButton.onTellMeClick();
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}
            </div>
            {campusSession && (clusterSkipAvailable || clusterFinishAvailable) ? (
              <div className="gem-hunt-overlay__cluster-actions pointer-events-auto">
                {clusterSkipAvailable && onClusterSkipHouse ? (
                  <button
                    type="button"
                    className="gem-hunt-overlay__cluster-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClusterSkipHouse();
                    }}
                  >
                    {t("gem.clusterSkip")}
                  </button>
                ) : null}
                {clusterFinishAvailable && onClusterFinishSession ? (
                  <button
                    type="button"
                    className="gem-hunt-overlay__cluster-btn gem-hunt-overlay__cluster-btn--primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClusterFinishSession();
                    }}
                  >
                    {t("gem.clusterFinish")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </footer>
      ) : null}

      {phase === "albumReveal" ? (
        <GemCollectAlbumReveal
          monsterId={monsterId}
          phase={albumRevealPhase}
          newAlbumFriend={albumRevealNewFriend}
          showActions={albumShowActions && albumRevealNewFriend}
          onClose={finishNewFriendClose}
          onOpenStickerBook={finishNewFriendStickerBook}
        />
      ) : null}

    </div>
  );

  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, getGemHuntPortalRoot());
}
