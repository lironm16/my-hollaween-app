"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { GemHuntOrientationArrow } from "@/components/gem-hunt/gem-hunt-orientation-arrow";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { OverlayCloseButton } from "@/components/overlay-close-button";
import { useDeviceHeading } from "@/hooks/use-device-heading";
import { useGemAnchorOverrides } from "@/hooks/use-gem-anchor-overrides";
import {
  GEM_COLLECT_OVERLAY_MS,
  GEM_FACING_TOLERANCE_DEG,
  bearingDegrees,
  gemAnchorForHouse,
  gemDistanceMeters,
  gemMonsterForHouse,
  GEM_HUNT_METERS,
  relativeWalkBearingDeg,
  type GemCollectFinishOptions,
} from "@/lib/gem-hunt";
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
  const [revealAssist, setRevealAssist] = useState(false);
  const [arGemVisible, setArGemVisible] = useState(true);
  const arGemVisibleRef = useRef(true);
  const [compassRetry, setCompassRetry] = useState(0);
  const [sessionActive, setSessionActive] = useState(Boolean(initialWebXrSession));
  const [platformMod, setPlatformMod] = useState<"gem-hunt-webxr--android" | "gem-hunt-webxr--ios" | null>(
    null,
  );

  useEffect(() => {
    if (isAndroidLike()) setPlatformMod("gem-hunt-webxr--android");
    else if (isIosLike()) setPlatformMod("gem-hunt-webxr--ios");
  }, []);
  const { heading } = useDeviceHeading(true, compassRetry);
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

  const effectiveLoc = simulateInRange
    ? { lat: house.lat, lng: house.lng, accuracy: 5 }
    : userLocation;
  const distanceM =
    effectiveLoc != null ? gemDistanceMeters(effectiveLoc, house) : null;
  const inCollectBand =
    simulateInRange ||
    (effectiveLoc != null && gemDistanceMeters(effectiveLoc, house) <= GEM_HUNT_METERS);
  const canCollect = collectEnabled && inCollectBand && placed;

  const floatBias = hashFloat(house.id, "webxr-float");
  const useFloat = floatBias > 0.62;
  const floatHeight = useFloat ? 0.22 + floatBias * 0.18 : 0;

  const handleCollect = useCallback(() => {
    if (!canCollect || phase === "collecting") return;
    collectingRef.current = true;
    setPhase("collecting");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([35, 40, 35]);
    }
    const overlayMs =
      encounterMode && repeatVisit ? GEM_ENCOUNTER_CELEBRATE_MS : GEM_COLLECT_OVERLAY_MS;
    window.setTimeout(() => {
      onCollectRef.current(monsterId, { cheer: true });
    }, overlayMs);
  }, [canCollect, encounterMode, monsterId, phase, repeatVisit]);

  const finishRepeatEncounter = useCallback(() => {
    onClose();
  }, [onClose]);

  const petRevealedForEncounter = sessionActive && placed && arGemVisible;
  const inRangeForEncounter = inCollectBand;

  const {
    encounterPhase,
    onTreatSuccess,
    onTreatMiss,
  } = useGemEncounterPhase({
    enabled: encounterMode && sessionActive,
    repeatVisit,
    collectEnabled: canCollect,
    petRevealed: petRevealedForEncounter,
    inRange: inRangeForEncounter,
    onEncounterCollect: handleCollect,
    onRepeatRewardDone: finishRepeatEncounter,
  });

  const encounterPhaseRef = useRef(encounterPhase);
  encounterPhaseRef.current = encounterPhase;

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
    effectiveLoc != null ? relativeWalkBearingDeg(effectiveLoc, anchor, heading) : null;
  const facingTarget =
    turnBearing != null && Math.abs(turnBearing) <= GEM_FACING_TOLERANCE_DEG;
  const gpsBearingToAnchor =
    effectiveLoc != null ? bearingDegrees(effectiveLoc, anchor) : null;
  const huntArrowPhoneRelative = heading != null && turnBearing != null;
  const huntArrowDeg = huntArrowPhoneRelative ? turnBearing : gpsBearingToAnchor;
  const huntArrowMapNorth = !huntArrowPhoneRelative && gpsBearingToAnchor != null;
  const walkGuideCopy = gemWalkGuideCopy(
    huntArrowPhoneRelative,
    facingTarget,
    turnBearing,
    gpsBearingToAnchor,
  );
  const mapsWalkUrl =
    userLocation != null && !simulateInRange
      ? googleMapsNavigateUrl(userLocation, { lat: anchor.lat, lng: anchor.lng })
      : null;
  const revealBtnActive = placed ? arGemVisible : revealAssist;
  const revealBtnLabel = placed ? (arGemVisible ? "הסתר" : "גלה לי") : revealAssist ? "הסתר" : "גלה לי";
  const showNavArrow =
    sessionActive &&
    hintPanel === "nav" &&
    !revealBtnActive &&
    huntArrowDeg != null &&
    effectiveLoc != null &&
    userLocation != null &&
    !simulateInRange;
  const hideFooterChrome = encounterMode && encounterUiChromeHidden(encounterPhase);
  const showEncounterFooter =
    encounterMode && encounterPhase === "approach" && phase !== "collecting";
  const showSessionFooter =
    sessionActive && phase !== "collecting" && (!encounterMode || showEncounterFooter) && !hideFooterChrome;

  const handleClose = useCallback(() => {
    if (encounterMode && encounterUiChromeHidden(encounterPhase)) return;
    if (phase === "collecting") return;
    onClose();
  }, [encounterMode, encounterPhase, onClose, phase]);

  const toggleHintPanel = useCallback(async () => {
    if (hintPanel === "nav") {
      setHintPanel(null);
      return;
    }
    placeAssistRef.current.forceOnce = false;
    placeAssistRef.current.fast = false;
    setRevealAssist(false);
    const ok = await requestGemHuntOrientationPermission({ force: true });
    if (ok) setCompassRetry((n) => n + 1);
    setHintPanel("nav");
  }, [hintPanel]);

  const onRevealAssist = useCallback(() => {
    if (phase === "collecting" || !sessionActive) return;

    if (placed) {
      const nextVisible = !arGemVisibleRef.current;
      arGemVisibleRef.current = nextVisible;
      setArGemVisible(nextVisible);
      setRevealAssist(nextVisible);
      return;
    }

    if (revealAssist) {
      placeAssistRef.current.forceOnce = false;
      placeAssistRef.current.fast = false;
      setRevealAssist(false);
      return;
    }

    setHintPanel(null);
    placeAssistRef.current.forceOnce = true;
    placeAssistRef.current.fast = true;
    setRevealAssist(true);
  }, [placed, phase, revealAssist, sessionActive]);

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
    let mixer: THREE.AnimationMixer | null = null;
    const startTime = performance.now();

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
      if (!reticle.visible) return;
      anchorGroup.position.setFromMatrixPosition(reticle.matrix);
      anchorGroup.quaternion.setFromRotationMatrix(reticle.matrix);
      anchorGroup.visible = true;
      isPlaced = true;
      stableHitFrames = 0;
      reticle.visible = false;
      setPlaced(true);
      setPhase("placed");
      setRevealAssist(true);
      arGemVisibleRef.current = true;
      setArGemVisible(true);
    };

    const onSelect = () => {
      if (collectingRef.current) return;
      if (isPlaced) {
        if (encounterMode) {
          const ep = encounterPhaseRef.current;
          if (ep === "encounter" && canCollectRef.current) return;
        } else if (canCollectRef.current) {
          handleCollectRef.current();
        }
        return;
      }
      placeFromReticle();
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
      setRevealAssist(false);
      arGemVisibleRef.current = true;
      setArGemVisible(true);
      setSessionActive(false);
      setShowManualStart(true);
    };

    const attachSession = async (session: XRSession) => {
      if (disposed || sessionAttached) return;
      sessionAttached = true;
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
        if (!frame || !hitTestSource) return;
        const ref = renderer.xr.getReferenceSpace() ?? refSpace;
        const hits = frame.getHitTestResults(hitTestSource);
        const t = (performance.now() - startTime) / 1000;
        const delta = lastFrameMs > 0 ? Math.min(0.05, (_t - lastFrameMs) / 1000) : 1 / 60;
        lastFrameMs = _t;
        const dancePhase = danceIndex * 0.37;

        if (!isPlaced && hits.length > 0) {
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

        anchorGroup.visible = isPlaced && arGemVisibleRef.current;

        if (isPlaced && arGemVisibleRef.current && !collectingRef.current) {
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
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay", "local-floor"],
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
        encounterPhase === "encounter" && "is-encounter-swipe",
        phase === "collecting" && "is-collecting",
      )}
      dir="rtl"
      onPointerDown={encounterPhase === "encounter" ? treatSwipe.onPointerDown : undefined}
      onPointerUp={encounterPhase === "encounter" ? treatSwipe.onPointerUp : undefined}
      onPointerCancel={encounterPhase === "encounter" ? treatSwipe.onPointerCancel : undefined}
    >
      <header className="gem-hunt-webxr__bar gem-hunt-webxr__bar--close-only" dir="ltr">
        <OverlayCloseButton label="סגירה" onClick={handleClose} className="gem-hunt-webxr__close-btn" />
      </header>

      <div ref={hostRef} className="gem-hunt-webxr__host" />

      {encounterMode ? (
        <GemEncounterLayer
          house={house}
          phase={encounterPhase}
          distanceM={distanceM}
          inRange={inRangeForEncounter}
          repeatVisit={repeatVisit}
          hideApproachLine={hintPanel === "nav"}
          showTutorial={encounterPhase === "encounter"}
          onOfferTreatButton={
            encounterPhase === "encounter" && canCollect
              ? () => {
                  markEncounterTutorialSeen();
                  onTreatSuccess();
                }
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
                        revealBtnActive && "is-active",
                      )}
                      aria-pressed={revealBtnActive}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRevealAssist();
                      }}
                    >
                      {revealBtnLabel}
                    </button>
                  ) : null}
                </div>
                {!encounterMode && canCollect && placed && arGemVisible ? (
                  <p className="gem-hunt-webxr__collect-hint" role="status">
                    הקישו על החיה במרחב כדי לאסוף
                  </p>
                ) : null}
              </div>
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
        )}
      </footer>
    </div>
  );

  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}
