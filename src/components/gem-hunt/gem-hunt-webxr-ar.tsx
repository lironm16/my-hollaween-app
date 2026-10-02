"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { GemHuntOrientationArrow } from "@/components/gem-hunt/gem-hunt-orientation-arrow";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { OverlayCloseButton } from "@/components/overlay-close-button";
import { useDeviceHeading } from "@/hooks/use-device-heading";
import { useGemHuntLocation } from "@/hooks/use-gem-hunt-location";
import { useGemAnchorOverrides } from "@/hooks/use-gem-anchor-overrides";
import {
  GEM_COLLECT_OVERLAY_MS,
  GEM_FACING_TOLERANCE_DEG,
  GEM_IN_CAMERA_ALBUM_REVEAL_ENABLED,
  bearingDegrees,
  gemAnchorForHouse,
  gemDistanceMeters,
  gemLabelHe,
  gemMonsterForHouse,
  GEM_WEBXR_GEO_PLACEMENT_ENABLED,
  GEM_WEBXR_HUNT_METERS,
  navTurnBearingForUi,
  relativeWalkBearingDeg,
  type GemCollectFinishOptions,
} from "@/lib/gem-hunt";
import {
  averageGeoSamples,
  geoPlacementReady,
  rigidTransformFromViewerOffset,
  tryCreateNativeGeospatialAnchor,
  viewerLocalOffsetMeters,
  type GeoPlacementSample,
} from "@/lib/gem-webxr-geospatial";
import { webXrSessionHasAnchors } from "@/lib/gem-hunt-ar-platform";
import { isGemTypeInCollection, loadGemCollected } from "@/lib/gem-progress";
import { requestGemHuntOrientationPermission } from "@/lib/gem-hunt-sensors";
import { gemWalkGuideCopy } from "@/lib/gem-hunt-walk-guide";
import { formatDistance } from "@/lib/geo";
import { gemMonsterMeta, gemMonsterTint, type GemMonsterId } from "@/lib/gem-monsters";
import { gemCollectDanceIndex } from "@/lib/gem-collect-dance";
import { googleMapsNavigateUrl } from "@/lib/route";
import type { PublicHouse } from "@/lib/types";
import type { UserLocation } from "@/hooks/use-user-location";
import { GemEncounterLayer } from "@/components/gem-hunt/gem-encounter-layer";
import { useGemEncounterPhase } from "@/hooks/use-gem-encounter-phase";
import { useTreatSwipe } from "@/hooks/use-treat-swipe";
import {
  GEM_ENCOUNTER_CELEBRATE_MS,
  encounterUiChromeHidden,
  markEncounterTutorialSeen,
} from "@/lib/gem-encounter";
import { isAndroidLike, isIosLike } from "@/lib/gem-hunt-ar-platform";
import { beginMapListOverlayCapture, endMapListOverlayCapture } from "@/lib/map-list-suspend";
import { cn } from "@/lib/utils";

type HuntPhase = "boot" | "placing" | "placed" | "collecting";

type Props = {
  house: PublicHouse;
  userLocation: UserLocation | null;
  simulateInRange?: boolean;
  collectEnabled?: boolean;
  encounterMode?: boolean;
  repeatVisit?: boolean;
  initialWebXrSession?: XRSession | null;
  onClose: () => void;
  onCollect: (monsterId: GemMonsterId, options?: GemCollectFinishOptions) => void;
  onFallbackCamera?: () => void;
};

const AUTO_PLACE_STABLE_FRAMES = 28;
const MODEL_SCALE = 0.52;

function hashFloat(seed: string, salt: string) {
  let h = 2166136261;
  const s = `${seed}\0${salt}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function frameModel(object: THREE.Object3D, scaleFactor: number) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scale = scaleFactor / maxDim;
  object.scale.setScalar(scale);
  object.position.sub(center.multiplyScalar(scale));
  object.position.y += size.y * scale * 0.02;
}

function pickIdleClip(clips: THREE.AnimationClip[]) {
  if (clips.length === 0) return null;
  const prefer = clips.find((c) => /idle|walk|breath|float|hover|fly|dance/i.test(c.name));
  return prefer ?? clips[0]!;
}

/** Fake ground shadow under the model feet — not at pivot origin (floaters had a “neck ring”). */
function placeGroundShadow(shadow: THREE.Mesh, model: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(model);
  shadow.position.y = box.min.y + 0.003;
  const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 0.08);
  const s = Math.min(1.05, Math.max(0.32, (span * 0.42) / 0.44));
  shadow.scale.setScalar(s);
}

/**
 * Android (Chrome): WebXR hit-test — pet anchored in real space; walk around with the phone.
 */
export function GemHuntWebXrAr({
  house,
  userLocation,
  simulateInRange = false,
  collectEnabled = true,
  encounterMode = true,
  repeatVisit = false,
  initialWebXrSession = null,
  onClose,
  onCollect,
  onFallbackCamera,
}: Props) {
  const monsterId = gemMonsterForHouse(house);
  const meta = gemMonsterMeta(monsterId);
  const danceIndex = gemCollectDanceIndex(house.id, monsterId);
  const { overrides: anchorOverrides } = useGemAnchorOverrides();
  const anchor = useMemo(
    () => gemAnchorForHouse(house),
    [house.id, house.lat, house.lng, anchorOverrides],
  );
  const [hintPanel, setHintPanel] = useState<null | "nav">(null);
  /** «גלה לי» — same semantics as iOS centerReveal (AR model stays in world). */
  const [centerReveal, setCenterReveal] = useState(false);
  const [userDismissedCenterGem, setUserDismissedCenterGem] = useState(false);
  const userDismissedCenterGemRef = useRef(false);
  const centerRevealRef = useRef(false);
  const encounterCollectLatchedRef = useRef(false);
  const collectFinishRef = useRef<number | null>(null);
  const [albumRevealNewFriend, setAlbumRevealNewFriend] = useState(true);
  const [compassRetry, setCompassRetry] = useState(0);
  const [sessionActive, setSessionActive] = useState(Boolean(initialWebXrSession));
  const [platformMod, setPlatformMod] = useState<"gem-hunt-webxr--android" | "gem-hunt-webxr--ios" | null>(
    null,
  );

  useEffect(() => {
    if (isAndroidLike()) setPlatformMod("gem-hunt-webxr--android");
    else if (isIosLike()) setPlatformMod("gem-hunt-webxr--ios");
  }, []);

  useEffect(() => {
    setCenterReveal(false);
    setUserDismissedCenterGem(false);
    setHintPanel(null);
  }, [house.id]);

  useEffect(() => {
    userDismissedCenterGemRef.current = userDismissedCenterGem;
  }, [userDismissedCenterGem]);

  useEffect(() => {
    centerRevealRef.current = centerReveal;
  }, [centerReveal]);

  useEffect(() => {
    beginMapListOverlayCapture();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      endMapListOverlayCapture();
    };
  }, []);

  const { heading } = useDeviceHeading(true, compassRetry);
  const headingRef = useRef<number | null>(heading);
  const liveLocRef = useRef<typeof userLocation>(null);
  const geoTargetRef = useRef({ lat: anchor.lat, lng: anchor.lng });
  const simulateInRangeRef = useRef(simulateInRange);
  const [geoLockMode, setGeoLockMode] = useState<"pending" | "sidewalk" | "native" | "local">(
    "pending",
  );
  const placeAssistRef = useRef({ forceOnce: false, fast: false });

  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const startBtnHostRef = useRef<HTMLDivElement>(null);

  const attachSessionRef = useRef<((session: XRSession) => Promise<void>) | null>(null);
  const collectingRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [showManualStart, setShowManualStart] = useState(!initialWebXrSession);
  const bootWebXrSessionRef = useRef(initialWebXrSession);
  bootWebXrSessionRef.current = initialWebXrSession;
  const [phase, setPhase] = useState<HuntPhase>("boot");
  const [placed, setPlaced] = useState(false);
  const onCollectRef = useRef(onCollect);
  onCollectRef.current = onCollect;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const effectiveLoc = simulateInRange
    ? { lat: house.lat, lng: house.lng, accuracy: 5 }
    : userLocation;
  const huntGps = useGemHuntLocation(!simulateInRange);
  const liveLoc = simulateInRange ? effectiveLoc : huntGps ?? userLocation;
  headingRef.current = heading;
  liveLocRef.current = liveLoc;
  geoTargetRef.current = { lat: anchor.lat, lng: anchor.lng };
  simulateInRangeRef.current = simulateInRange;
  const distanceM =
    liveLoc != null ? gemDistanceMeters(liveLoc, house) : null;
  const inWebXrHuntBand =
    simulateInRange ||
    (liveLoc != null && gemDistanceMeters(liveLoc, house) <= GEM_WEBXR_HUNT_METERS);
  /** Tighter than map «hunt» (25 m) — matches iOS world-pin radius on WebXR. */
  const canCollectNow =
    inWebXrHuntBand && (simulateInRange || collectEnabled);
  const canCollect = canCollectNow && inWebXrHuntBand && placed;
  const inWebXrHuntBandRef = useRef(inWebXrHuntBand);
  inWebXrHuntBandRef.current = inWebXrHuntBand;
  const setGeoLockModeRef = useRef(setGeoLockMode);
  setGeoLockModeRef.current = setGeoLockMode;

  const floatBias = hashFloat(house.id, "webxr-float");
  const useFloat = floatBias > 0.62;
  const floatHeight = useFloat ? 0.22 + floatBias * 0.18 : 0;

  const handleCollect = useCallback(() => {
    if (phase === "collecting") return;
    const inBand =
      inWebXrHuntBand ||
      encounterCollectLatchedRef.current ||
      simulateInRange;
    if (!inBand || !placed) return;
    const entries = loadGemCollected();
    const newAlbumFriend = !repeatVisit && !isGemTypeInCollection(monsterId, entries);
    collectingRef.current = true;
    setPhase("collecting");
    setAlbumRevealNewFriend(newAlbumFriend);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([20, 40, 60]);
    }
    if (collectFinishRef.current != null) window.clearTimeout(collectFinishRef.current);
    const overlayMs =
      encounterMode && repeatVisit ? GEM_ENCOUNTER_CELEBRATE_MS : GEM_COLLECT_OVERLAY_MS;
    collectFinishRef.current = window.setTimeout(() => {
      collectFinishRef.current = null;
      if (newAlbumFriend) {
        if (GEM_IN_CAMERA_ALBUM_REVEAL_ENABLED) {
          /* WebXR has no in-camera album — same as overlay fallback */
        }
        onCollectRef.current(monsterId, { cheer: false, navigateStickerBook: true });
        onCloseRef.current();
        return;
      }
      onCollectRef.current(monsterId, { cheer: true });
      onCloseRef.current();
    }, overlayMs);
  }, [
    canCollectNow,
    encounterMode,
    monsterId,
    phase,
    placed,
    repeatVisit,
    simulateInRange,
  ]);

  const finishRepeatEncounter = useCallback(() => {
    onClose();
  }, [onClose]);

  const showArGem =
    placed && (phase === "collecting" || !userDismissedCenterGem);

  const petRevealedForEncounter = sessionActive && placed && showArGem;
  const inRangeForEncounter = inWebXrHuntBand;

  const {
    encounterPhase,
    setEncounterPhase,
    onTreatSuccess,
    onTreatMiss,
  } = useGemEncounterPhase({
    enabled: encounterMode && sessionActive,
    repeatVisit,
    collectEnabled: canCollectNow,
    petRevealed: petRevealedForEncounter,
    inRange: inRangeForEncounter,
    onEncounterCollect: handleCollect,
    onRepeatRewardDone: finishRepeatEncounter,
  });

  const encounterPhaseRef = useRef(encounterPhase);
  encounterPhaseRef.current = encounterPhase;

  useEffect(() => {
    if (encounterMode && encounterPhase === "encounter" && (canCollectNow || simulateInRange)) {
      encounterCollectLatchedRef.current = true;
    }
  }, [encounterMode, encounterPhase, canCollectNow, simulateInRange]);

  /** «גלה לי» during approach — skip wait (iOS parity). */
  useEffect(() => {
    if (!encounterMode || !centerReveal || userDismissedCenterGem || encounterPhase !== "approach")
      return;
    setEncounterPhase("encounter");
  }, [encounterMode, centerReveal, userDismissedCenterGem, encounterPhase, setEncounterPhase]);

  const encounterForcesReveal =
    !userDismissedCenterGem &&
    encounterMode &&
    (encounterPhase === "encounter" ||
      encounterPhase.startsWith("resolve") ||
      encounterPhase === "reward");
  const tellMeRevealActive = centerReveal || encounterForcesReveal;

  const treatSwipe = useTreatSwipe({
    onSuccess: () => {
      markEncounterTutorialSeen();
      onTreatSuccess();
    },
    onMiss: onTreatMiss,
  });

  const canCollectRef = useRef(canCollect);
  canCollectRef.current = canCollect;
  const handleCollectRef = useRef(handleCollect);
  handleCollectRef.current = handleCollect;

  useEffect(() => {
    if (error && onFallbackCamera) onFallbackCamera();
  }, [error, onFallbackCamera]);

  const turnBearing =
    liveLoc != null ? relativeWalkBearingDeg(liveLoc, anchor, heading) : null;
  const facingTarget =
    turnBearing != null && Math.abs(turnBearing) <= GEM_FACING_TOLERANCE_DEG;
  const gpsBearingToAnchor =
    liveLoc != null ? bearingDegrees(liveLoc, anchor) : null;
  const huntArrowPhoneRelative = heading != null && turnBearing != null;
  const navTurnBearing =
    turnBearing != null ? navTurnBearingForUi(turnBearing) : null;
  const huntArrowDeg = huntArrowPhoneRelative ? navTurnBearing : gpsBearingToAnchor;
  const huntArrowMapNorth = !huntArrowPhoneRelative && gpsBearingToAnchor != null;
  const walkGuideCopy = gemWalkGuideCopy(
    huntArrowPhoneRelative,
    facingTarget,
    navTurnBearing,
    gpsBearingToAnchor,
  );
  const mapsWalkUrl =
    liveLoc != null && !simulateInRange
      ? googleMapsNavigateUrl(liveLoc, { lat: anchor.lat, lng: anchor.lng })
      : null;
  const showNavArrow = encounterMode
    ? sessionActive &&
      encounterPhase === "approach" &&
      hintPanel === "nav" &&
      !centerReveal &&
      huntArrowDeg != null &&
      liveLoc != null &&
      !simulateInRange
    : sessionActive &&
      hintPanel === "nav" &&
      !centerReveal &&
      huntArrowDeg != null &&
      liveLoc != null &&
      !simulateInRange;
  const hideFooterChrome = encounterMode && encounterUiChromeHidden(encounterPhase);
  const showEncounterFooter =
    encounterMode &&
    (encounterPhase === "approach" || encounterPhase === "encounter") &&
    phase !== "collecting";
  const showEncounterCollectFooter = false;
  const showSessionFooter =
    sessionActive && phase !== "collecting" && (!encounterMode || showEncounterFooter) && !hideFooterChrome;

  const offerEncounterCollect = useCallback(() => {
    if (encounterPhase !== "encounter") return;
    if (!canCollectNow && !encounterCollectLatchedRef.current && !simulateInRange) return;
    if (!placed || !showArGem) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([12, 28, 18]);
    }
    encounterCollectLatchedRef.current = true;
    markEncounterTutorialSeen();
    onTreatSuccess();
  }, [
    canCollectNow,
    encounterPhase,
    onTreatSuccess,
    placed,
    showArGem,
    simulateInRange,
  ]);

  const offerEncounterCollectRef = useRef(offerEncounterCollect);
  offerEncounterCollectRef.current = offerEncounterCollect;

  const handleClose = useCallback(() => {
    if (phase === "collecting") return;
    onClose();
  }, [onClose, phase]);

  const toggleHintPanel = useCallback(async () => {
    if (hintPanel === "nav") {
      setHintPanel(null);
      return;
    }
    if (centerReveal || tellMeRevealActive) {
      setUserDismissedCenterGem(true);
      if (encounterMode && encounterPhase === "encounter") {
        setEncounterPhase("approach");
      }
    }
    placeAssistRef.current.forceOnce = false;
    placeAssistRef.current.fast = false;
    setCenterReveal(false);
    const ok = await requestGemHuntOrientationPermission({ force: true });
    if (ok) setCompassRetry((n) => n + 1);
    setHintPanel("nav");
  }, [
    hintPanel,
    centerReveal,
    tellMeRevealActive,
    encounterMode,
    encounterPhase,
    setEncounterPhase,
  ]);

  const toggleRevealMe = useCallback(() => {
    if (phase === "collecting" || !sessionActive) return;
    if (!inWebXrHuntBand && !simulateInRange) return;

    if (centerReveal) {
      setCenterReveal(false);
      setUserDismissedCenterGem(true);
      placeAssistRef.current.forceOnce = false;
      placeAssistRef.current.fast = false;
      if (encounterMode && encounterPhase === "encounter") {
        setEncounterPhase("approach");
      }
      return;
    }

    setUserDismissedCenterGem(false);
    setHintPanel(null);

    if (!placed) {
      placeAssistRef.current.forceOnce = true;
      placeAssistRef.current.fast = true;
      setCenterReveal(true);
      return;
    }

    setCenterReveal(true);
  }, [
    centerReveal,
    encounterMode,
    encounterPhase,
    phase,
    placed,
    sessionActive,
    setEncounterPhase,
    inWebXrHuntBand,
    simulateInRange,
  ]);

  const showWebXrRangeHint =
    sessionActive &&
    !simulateInRange &&
    !inWebXrHuntBand &&
    phase !== "collecting";

  const showWebXrGeoHint =
    sessionActive &&
    !placed &&
    phase !== "collecting" &&
    inWebXrHuntBand &&
    geoLockMode === "pending" &&
    GEM_WEBXR_GEO_PLACEMENT_ENABLED;

  const collectBanner =
    phase === "collecting"
      ? albumRevealNewFriend
        ? "כל הכבוד!! מצאתם חבר חדש!"
        : `מצאתם שוב את ${gemLabelHe(monsterId)}`
      : null;

  useEffect(() => {
    const host = hostRef.current;
    const root = rootRef.current;
    const startHost = startBtnHostRef.current;
    if (!host || !root || !startHost || !navigator.xr) {
      onFallbackCamera?.();
      return;
    }

    let disposed = false;
    let arButton: HTMLElement | null = null;
    let hitTestSource: XRHitTestSource | null = null;
    let hitTestSourceRequested = false;
    let sessionAttached = false;
    let stableHitFrames = 0;
    let isPlaced = false;
    let worldAnchor: XRAnchor | null = null;
    let geoSamples: GeoPlacementSample[] = [];
    let geoNativeTried = false;
    let geoAttemptFrame = 0;
    let anchorsEnabled = false;
    let mixer: THREE.AnimationMixer | null = null;
    const startTime = performance.now();

    const finishPlacement = (mode: "sidewalk" | "native" | "local") => {
      isPlaced = true;
      stableHitFrames = 0;
      reticle.visible = false;
      anchorGroup.visible = true;
      setPlaced(true);
      setPhase("placed");
      setGeoLockModeRef.current(mode);
    };

    const syncAnchorGroupToWorldAnchor = (frame: XRFrame, ref: XRReferenceSpace) => {
      if (!worldAnchor) return;
      const pose = frame.getPose(worldAnchor.anchorSpace, ref);
      if (!pose) return;
      anchorGroup.matrixAutoUpdate = false;
      anchorGroup.matrix.fromArray(pose.transform.matrix);
      anchorGroup.matrix.decompose(anchorGroup.position, anchorGroup.quaternion, anchorGroup.scale);
      anchorGroup.visible =
        collectingRef.current || !userDismissedCenterGemRef.current;
    };

    const pushGeoSample = () => {
      const loc = liveLocRef.current;
      if (!loc || !inWebXrHuntBandRef.current) return;
      const acc = loc.accuracy ?? 99;
      if (acc > 28) return;
      geoSamples.push({ lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy });
      if (geoSamples.length > 8) geoSamples.shift();
    };

    const tryLockGeoPlacement = async (
      frame: XRFrame,
      ref: XRReferenceSpace,
      viewerSpace: XRReferenceSpace,
    ) => {
      if (isPlaced || !GEM_WEBXR_GEO_PLACEMENT_ENABLED) return;
      if (!inWebXrHuntBandRef.current) return;

      const assist = placeAssistRef.current;
      const target = geoTargetRef.current;
      const headingDeg = headingRef.current;

      if (simulateInRangeRef.current) {
        const simUser = { lat: house.lat, lng: house.lng, accuracy: 3 };
        const h = headingDeg ?? bearingDegrees(simUser, target);
        const off = viewerLocalOffsetMeters(simUser, target, h);
        anchorGroup.position.set(off.x, 0, off.z);
        finishPlacement("sidewalk");
        assist.forceOnce = false;
        assist.fast = false;
        return;
      }

      pushGeoSample();
      const ready = geoPlacementReady(geoSamples, headingDeg, target);
      const force = assist.forceOnce;
      if (!ready && !force) return;

      const avg =
        averageGeoSamples(geoSamples) ??
        (liveLocRef.current
          ? {
              lat: liveLocRef.current.lat,
              lng: liveLocRef.current.lng,
              accuracy: liveLocRef.current.accuracy,
            }
          : null);
      if (!avg || headingDeg == null) return;

      if (!geoNativeTried) {
        geoNativeTried = true;
        const native = await tryCreateNativeGeospatialAnchor(frame, target);
        if (native) {
          worldAnchor = native;
          finishPlacement("native");
          assist.forceOnce = false;
          assist.fast = false;
          return;
        }
      }

      const off = viewerLocalOffsetMeters(avg, target, headingDeg);
      if (off.quality === "weak" && !force) return;

      if (anchorsEnabled && frame.createAnchor) {
        try {
          const xf = rigidTransformFromViewerOffset(off.x, 0, off.z);
          worldAnchor = await frame.createAnchor(xf, viewerSpace);
          finishPlacement("sidewalk");
          assist.forceOnce = false;
          assist.fast = false;
          return;
        } catch {
          worldAnchor = null;
        }
      }

      anchorGroup.position.set(off.x, 0, off.z);
      finishPlacement("local");
      assist.forceOnce = false;
      assist.fast = false;
    };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3048, 0.95));
    const key = new THREE.DirectionalLight(0xfff0dd, 1.05);
    key.position.set(2, 4, 1);
    scene.add(key);

    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.09, 0.12, 36).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 }),
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    const anchorGroup = new THREE.Group();
    anchorGroup.visible = false;
    scene.add(anchorGroup);

    const pivot = new THREE.Group();
    anchorGroup.add(pivot);

    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.renderOrder = -1;
    pivot.add(shadow);
    let footShadowScale = 1;

    const tint = gemMonsterTint(house.id);
    const loader = new GLTFLoader();
    loader.load(
      meta.glbPath,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        frameModel(model, MODEL_SCALE);
        model.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          const mat = obj.material;
          if (!(mat instanceof THREE.MeshStandardMaterial)) return;
          mat.metalness = 0.06;
          mat.roughness = 0.52;
          mat.color.offsetHSL(tint.hue, tint.saturation, tint.lightness);
        });
        pivot.add(model);
        placeGroundShadow(shadow, model);
        footShadowScale = shadow.scale.x;
        pivot.position.y = floatHeight;

        const clip = pickIdleClip(gltf.animations);
        if (clip) {
          mixer = new THREE.AnimationMixer(model);
          const action = mixer.clipAction(clip);
          action.loop = THREE.LoopRepeat;
          action.play();
        }
      },
      undefined,
      () => setError("לא הצלחנו לטעון את הדמות"),
    );

    const placeFromReticle = () => {
      if (!inWebXrHuntBandRef.current || !reticle.visible) return;
      anchorGroup.position.setFromMatrixPosition(reticle.matrix);
      anchorGroup.quaternion.setFromRotationMatrix(reticle.matrix);
      finishPlacement("local");
    };

    const onSelect = () => {
      if (collectingRef.current) return;
      if (isPlaced) {
        if (encounterMode) {
          const ep = encounterPhaseRef.current;
          if (
            ep === "encounter" &&
            !userDismissedCenterGemRef.current &&
            (canCollectRef.current || encounterCollectLatchedRef.current)
          ) {
            offerEncounterCollectRef.current();
            return;
          }
        } else if (canCollectRef.current) {
          handleCollectRef.current();
        }
        return;
      }
      if (inWebXrHuntBandRef.current) placeFromReticle();
    };

    const onSessionEnd = () => {
      sessionAttached = false;
      isPlaced = false;
      anchorGroup.visible = false;
      reticle.visible = false;
      stableHitFrames = 0;
      hitTestSourceRequested = false;
      hitTestSource?.cancel?.();
      hitTestSource = null;
      renderer.setAnimationLoop(null);
      setPlaced(false);
      setPhase("boot");
      setCenterReveal(false);
      setUserDismissedCenterGem(false);
      setGeoLockModeRef.current("pending");
      worldAnchor?.delete();
      worldAnchor = null;
      geoSamples = [];
      setSessionActive(false);
      setShowManualStart(true);
    };

    const attachSession = async (session: XRSession) => {
      if (disposed || sessionAttached) return;
      sessionAttached = true;
      anchorsEnabled = webXrSessionHasAnchors(session);
      await renderer.xr.setSession(session);
      session.addEventListener("select", onSelect);
      session.addEventListener("end", onSessionEnd);

      if (hitTestSourceRequested) return;
      hitTestSourceRequested = true;
      const viewerSpace = await session.requestReferenceSpace("viewer");
      let refSpace: XRReferenceSpace;
      try {
        refSpace = await session.requestReferenceSpace("local-floor");
      } catch {
        refSpace = await session.requestReferenceSpace("local");
      }
      renderer.xr.setReferenceSpace(refSpace);
      hitTestSource = (await session.requestHitTestSource!({ space: viewerSpace })) ?? null;

      let lastFrameMs = 0;
      renderer.setAnimationLoop((_t, frame) => {
        if (!frame) return;
        const ref = renderer.xr.getReferenceSpace() ?? refSpace;
        const hits = hitTestSource ? frame.getHitTestResults(hitTestSource) : [];
        const t = (performance.now() - startTime) / 1000;
        const delta = lastFrameMs > 0 ? Math.min(0.05, (_t - lastFrameMs) / 1000) : 1 / 60;
        lastFrameMs = _t;
        const dancePhase = danceIndex * 0.37;

        if (isPlaced && worldAnchor) {
          syncAnchorGroupToWorldAnchor(frame, ref);
        }

        const allowHitTestFallback =
          !GEM_WEBXR_GEO_PLACEMENT_ENABLED || performance.now() - startTime > 10_000;

        if (!isPlaced && GEM_WEBXR_GEO_PLACEMENT_ENABLED && inWebXrHuntBandRef.current) {
          geoAttemptFrame += 1;
          if (geoAttemptFrame % 12 === 0 || placeAssistRef.current.forceOnce) {
            void tryLockGeoPlacement(frame, ref, viewerSpace);
          }
        }

        if (
          !isPlaced &&
          inWebXrHuntBandRef.current &&
          allowHitTestFallback &&
          hits.length > 0
        ) {
          const pose = hits[0]!.getPose(ref);
          if (pose) {
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
            stableHitFrames += 1;
            const assist = placeAssistRef.current;
            const threshold = assist.fast ? 8 : AUTO_PLACE_STABLE_FRAMES;
            if (assist.forceOnce) {
              placeFromReticle();
              assist.forceOnce = false;
              assist.fast = false;
            } else if (stableHitFrames >= threshold) {
              placeFromReticle();
              assist.fast = false;
            } else if (stableHitFrames === 8) {
              setPhase("placing");
            }
          }
        } else if (!isPlaced) {
          stableHitFrames = 0;
          reticle.visible = false;
        }

        if (!worldAnchor) {
          anchorGroup.visible =
            isPlaced && (collectingRef.current || !userDismissedCenterGemRef.current);
        }

        if (
          isPlaced &&
          !userDismissedCenterGemRef.current &&
          !collectingRef.current
        ) {
          const ep = encounterPhaseRef.current;
          const wiggle =
            ep === "resolve-wiggle1" || ep === "resolve-wiggle2" || ep === "resolve-breakout";
          const bobAmp = useFloat ? 0.055 : 0.038;
          const bob = Math.sin(t * (useFloat ? 1.6 : 2.4) + dancePhase) * bobAmp;
          pivot.position.y = floatHeight + bob;
          if (wiggle) {
            pivot.rotation.z = Math.sin(t * 14 + dancePhase) * 0.22;
            pivot.rotation.x = Math.sin(t * 11 + dancePhase) * 0.12;
            pivot.rotation.y = 0;
          } else {
            pivot.rotation.z = Math.sin(t * 1.1 + dancePhase) * 0.06;
            pivot.rotation.x = Math.sin(t * 0.85 + dancePhase * 0.7) * 0.04;
            pivot.rotation.y = t * 0.22 + dancePhase;
          }
          const shadowPulse = 1 + (useFloat ? 0.12 : 0.06) * Math.sin(t * 2);
          shadow.scale.setScalar(footShadowScale * shadowPulse);
          shadowMat.opacity = useFloat ? 0.2 : 0.26;
        }

        if (collectingRef.current) {
          const hop = Math.abs(Math.sin(t * 3.4 + dancePhase));
          pivot.rotation.y = t * (2.1 + danceIndex * 0.08);
          pivot.position.y = floatHeight + Math.sin(t * 4.8 + dancePhase) * 0.14 + hop * 0.08;
          pivot.rotation.x = Math.sin(t * 2.35 + dancePhase) * 0.35;
        }

        mixer?.update(delta);
        renderer.render(scene, camera);
      });
    };

    attachSessionRef.current = attachSession;

    const bootSession = bootWebXrSessionRef.current;
    if (bootSession) {
      void attachSession(bootSession);
      setShowManualStart(false);
      setSessionActive(true);
    }

    arButton = ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test", "local-floor"],
      optionalFeatures: ["dom-overlay", "anchors", "geo-alignment"],
      domOverlay: { root },
    });
    arButton.className = "gem-hunt-webxr__start";
    arButton.textContent = "התחילו AR";
    arButton.hidden = !showManualStart;
    startHost.appendChild(arButton);

    const onSessionStart = () => {
      const session = renderer.xr.getSession();
      if (session) void attachSession(session);
      setShowManualStart(false);
      setSessionActive(true);
    };
    renderer.xr.addEventListener("sessionstart", onSessionStart);

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      attachSessionRef.current = null;
      window.removeEventListener("resize", onResize);
      renderer.xr.removeEventListener("sessionstart", onSessionStart);
      renderer.setAnimationLoop(null);
      const session = renderer.xr.getSession();
      session?.removeEventListener("select", onSelect);
      session?.removeEventListener("end", onSessionEnd);
      try {
        void session?.end();
      } catch {
        /* ignore */
      }
      renderer.dispose();
      arButton?.remove();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
      hitTestSource?.cancel?.();
      mixer = null;
    };
  }, [danceIndex, encounterMode, floatHeight, house.id, meta.glbPath, onFallbackCamera, useFloat]);

  useEffect(() => {
    const btn = startBtnHostRef.current?.querySelector(".gem-hunt-webxr__start") as HTMLElement | null;
    if (btn) btn.hidden = !showManualStart;
  }, [showManualStart]);

  const overlay = (
    <div
      ref={rootRef}
      className={cn(
        "gem-hunt-webxr",
        platformMod,
        platformMod === "gem-hunt-webxr--android" && "gem-hunt-overlay--android",
        platformMod === "gem-hunt-webxr--ios" && "gem-hunt-overlay--ios",
        encounterMode && "is-encounter-mode",
        phase === "collecting" && "is-collecting",
        sessionActive && "is-session-active",
      )}
      dir="rtl"
    >
      <header className="gem-hunt-webxr__bar gem-hunt-webxr__bar--close-only" dir="ltr">
        <OverlayCloseButton label="סגירה" onClick={handleClose} className="gem-hunt-webxr__close-btn" />
      </header>

      {collectBanner ? (
        <p
          className={cn(
            "gem-hunt-overlay__collect-banner",
            phase === "collecting" && "is-exploding",
          )}
          role="status"
        >
          {collectBanner}
        </p>
      ) : null}

      {phase === "collecting" ? (
        <div className="gem-hunt-overlay__collect-flash" aria-hidden />
      ) : null}

      <div ref={hostRef} className="gem-hunt-webxr__host" />

      {encounterMode ? (
        <GemEncounterLayer
          house={house}
          phase={encounterPhase}
          distanceM={distanceM}
          inRange={inRangeForEncounter}
          repeatVisit={repeatVisit}
          hideApproachLine={hintPanel === "nav" || centerReveal}
          showTutorial={encounterPhase === "encounter"}
          onOfferTreatButton={
            encounterPhase === "encounter" && tellMeRevealActive
              ? () => offerEncounterCollect()
              : undefined
          }
        />
      ) : null}

      {showNavArrow ? (
        <div className="gem-hunt-overlay__nav-layer gem-hunt-webxr__nav-layer" aria-hidden>
          <GemHuntOrientationArrow
            bearingDeg={huntArrowDeg!}
            facing={facingTarget && !huntArrowMapNorth}
            mapNorth={huntArrowMapNorth}
          />
        </div>
      ) : null}

      {encounterPhase === "encounter" && !centerReveal && phase !== "collecting" ? (
        <div
          className="gem-hunt-overlay__encounter-swipe-zone"
          aria-hidden
          onPointerDown={treatSwipe.onPointerDown}
          onPointerUp={treatSwipe.onPointerUp}
          onPointerCancel={treatSwipe.onPointerCancel}
        />
      ) : null}

      <footer
        className="gem-hunt-overlay__footer gem-hunt-overlay__footer--hunt gem-hunt-webxr__footer"
        dir="rtl"
      >
        {error ? (
          <p className="gem-hunt-webxr__error" role="alert">
            {error} — עוברים למצב מצלמה…
          </p>
        ) : (
          <div className="gem-hunt-overlay__footer-stack">
            <div className="gem-hunt-overlay__footer-hint-slot">
              {showWebXrRangeHint ? (
                <p className="gem-hunt-overlay__footer-hint gem-hunt-overlay__footer-hint--plain" role="status">
                  התקרבו לנקודה על המדרכה (עד {GEM_WEBXR_HUNT_METERS} מ׳) — אז אפשר לשים את החיה ולאסוף.
                </p>
              ) : null}
              {showWebXrGeoHint ? (
                <p className="gem-hunt-overlay__footer-hint gem-hunt-overlay__footer-hint--plain" role="status">
                  מאתרים את היהלום על המדרכה (אותה נקודה כמו במפה)…
                </p>
              ) : null}
              {showEncounterFooter && encounterPhase === "encounter" ? (
                <p className="gem-hunt-overlay__footer-hint gem-hunt-overlay__footer-hint--plain" role="note">
                  סובבו את החיה באצבע. לאיסוף — הקישו עליה.
                </p>
              ) : null}
              {showSessionFooter && hintPanel === "nav" ? (
                <div
                  className="gem-hunt-overlay__walk-guide gem-hunt-overlay__walk-guide--hint gem-hunt-overlay__walk-guide--footer"
                  role="region"
                  aria-label="הנחיות הליכה ליהלום"
                >
                  <p className="gem-hunt-overlay__walk-text">
                    {walkGuideCopy}
                    {distanceM != null ? ` · ${formatDistance(distanceM)}` : null}
                  </p>
                  {mapsWalkUrl ? (
                    <a
                      href={mapsWalkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gem-hunt-overlay__walk-maps"
                    >
                      הליכה ב-Google Maps ליהלום
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div
              ref={startBtnHostRef}
              className={cn(
                "gem-hunt-webxr__start-host gem-hunt-webxr__start-host--footer",
                sessionActive && "is-hidden",
              )}
            />
            {showSessionFooter ? (
              <div className="gem-hunt-overlay__footer-controls">
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
                      <span className="gem-hunt-overlay__hint-btn-title">רמז</span>
                      <span className="gem-hunt-overlay__hint-btn-sub">כוון אותי</span>
                    </span>
                  </button>
                  {!encounterMode || showEncounterFooter ? (
                    <button
                      type="button"
                      className={cn(
                        "gem-hunt-overlay__hint-btn gem-hunt-overlay__hint-btn--reveal gem-hunt-overlay__hint-btn--compact",
                        centerReveal && "is-active",
                      )}
                      aria-pressed={centerReveal}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRevealMe();
                      }}
                    >
                      {centerReveal ? "הסתר" : "גלה לי"}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </footer>
    </div>
  );

  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}
