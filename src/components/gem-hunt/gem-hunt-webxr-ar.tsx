"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { OverlayCloseButton } from "@/components/overlay-close-button";
import {
  GEM_COLLECT_OVERLAY_MS,
  gemDistanceMeters,
  gemLabelHe,
  gemMonsterForHouse,
  GEM_HUNT_METERS,
  type GemCollectFinishOptions,
} from "@/lib/gem-hunt";
import { requestGemHuntWebXrSession } from "@/lib/gem-hunt-webxr-init";
import { gemMonsterMeta, gemMonsterTint, type GemMonsterId } from "@/lib/gem-monsters";
import { gemCollectDanceIndex } from "@/lib/gem-collect-dance";
import type { PublicHouse } from "@/lib/types";
import type { UserLocation } from "@/hooks/use-user-location";
import { cn } from "@/lib/utils";

type HuntPhase = "boot" | "placing" | "placed" | "collecting";

type Props = {
  house: PublicHouse;
  userLocation: UserLocation | null;
  simulateInRange?: boolean;
  collectEnabled?: boolean;
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
  const prefer = clips.find((c) => /idle|walk|breath|float/i.test(c.name));
  return prefer ?? clips[0]!;
}

/**
 * Android (Chrome): WebXR hit-test — pet anchored in real space; walk around with the phone.
 */
export function GemHuntWebXrAr({
  house,
  userLocation,
  simulateInRange = false,
  collectEnabled = true,
  onClose,
  onCollect,
  onFallbackCamera,
}: Props) {
  const monsterId = gemMonsterForHouse(house);
  const meta = gemMonsterMeta(monsterId);
  const petName = gemLabelHe(monsterId);
  const danceIndex = gemCollectDanceIndex(house.id, monsterId);

  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const startBtnHostRef = useRef<HTMLDivElement>(null);

  const pendingSessionRef = useRef<XRSession | null>(null);
  const attachSessionRef = useRef<((session: XRSession) => Promise<void>) | null>(null);
  const collectingRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [showManualStart, setShowManualStart] = useState(false);
  const [phase, setPhase] = useState<HuntPhase>("boot");
  const [placed, setPlaced] = useState(false);
  const [hint, setHint] = useState("מכוונים למדרכה — הדמות תופיע אוטומטית");

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
    window.setTimeout(() => {
      onCollectRef.current(monsterId, { cheer: true });
    }, GEM_COLLECT_OVERLAY_MS);
  }, [canCollect, monsterId, phase]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    void requestGemHuntWebXrSession(root).then((session) => {
      if (cancelled) return;
      if (session && attachSessionRef.current) {
        void attachSessionRef.current(session).catch(() => setShowManualStart(true));
      } else if (session) {
        pendingSessionRef.current = session;
      } else {
        setShowManualStart(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const root = rootRef.current;
    const startHost = startBtnHostRef.current;
    if (!host || !root || !startHost || !navigator.xr) {
      setError("AR לא נתמך במכשיר זה");
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

    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34 });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.004;
    pivot.add(shadow);

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
      setHint(useFloat ? "הלכו מסביב — הדמות באוויר" : "הלכו מסביב — הדמות על המדרכה");
    };

    const onSelect = () => {
      if (collectingRef.current) return;
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
      setHint("מכוונים למדרכה — הדמות תופיע אוטומטית");
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

      renderer.setAnimationLoop((_t, frame) => {
        if (!frame || !hitTestSource) return;
        const ref = renderer.xr.getReferenceSpace() ?? refSpace;
        const hits = frame.getHitTestResults(hitTestSource);
        const t = (performance.now() - startTime) / 1000;
        const dancePhase = danceIndex * 0.37;

        if (!isPlaced && hits.length > 0) {
          const pose = hits[0]!.getPose(ref);
          if (pose) {
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
            stableHitFrames += 1;
            if (stableHitFrames >= AUTO_PLACE_STABLE_FRAMES) {
              placeFromReticle();
            } else if (stableHitFrames === 8) {
              setPhase("placing");
              setHint("מזהים משטח…");
            }
          }
        } else if (!isPlaced) {
          stableHitFrames = 0;
          reticle.visible = false;
        }

        if (isPlaced && !collectingRef.current) {
          const bob = useFloat ? Math.sin(t * 1.6 + dancePhase) * 0.045 : Math.sin(t * 2.2) * 0.018;
          pivot.position.y = floatHeight + bob;
          shadow.scale.setScalar(1 + (useFloat ? 0.15 : 0) * Math.sin(t * 2));
          shadowMat.opacity = useFloat ? 0.22 : 0.34;
        }

        if (collectingRef.current) {
          const hop = Math.abs(Math.sin(t * 3.4 + dancePhase));
          pivot.rotation.y = t * (2.1 + danceIndex * 0.08);
          pivot.position.y = floatHeight + Math.sin(t * 4.8 + dancePhase) * 0.14 + hop * 0.08;
          pivot.rotation.x = Math.sin(t * 2.35 + dancePhase) * 0.35;
        }

        mixer?.update(1 / 60);
        renderer.render(scene, camera);
      });
    };

    attachSessionRef.current = attachSession;

    if (pendingSessionRef.current) {
      void attachSession(pendingSessionRef.current);
      pendingSessionRef.current = null;
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
  }, [danceIndex, floatHeight, house.id, meta.glbPath, useFloat]);

  useEffect(() => {
    const btn = startBtnHostRef.current?.querySelector(".gem-hunt-webxr__start") as HTMLElement | null;
    if (btn) btn.hidden = !showManualStart;
  }, [showManualStart]);

  const overlay = (
    <div ref={rootRef} className={cn("gem-hunt-webxr", phase === "collecting" && "is-collecting")} dir="rtl">
      <header className="gem-hunt-webxr__bar">
        <div className="gem-hunt-webxr__bar-text">
          <p className="gem-hunt-webxr__kicker">AR במרחב</p>
          <p className="gem-hunt-webxr__title">{petName}</p>
        </div>
        <OverlayCloseButton label="סגירה" onClick={onClose} className="gem-hunt-webxr__close-btn" />
      </header>

      <div ref={hostRef} className="gem-hunt-webxr__host" />
      <div ref={startBtnHostRef} className="gem-hunt-webxr__start-host" />

      <footer className="gem-hunt-webxr__footer">
        {error ? (
          <p className="gem-hunt-webxr__error" role="alert">
            {error}
            {onFallbackCamera ? (
              <button type="button" className="gem-hunt-webxr__fallback" onClick={onFallbackCamera}>
                מצב מצלמה
              </button>
            ) : null}
          </p>
        ) : (
          <>
            <p className="gem-hunt-webxr__hint" role="status">
              {hint}
              {distanceM != null ? ` · ~${Math.round(distanceM)} מ׳` : null}
            </p>
            {!placed ? (
              <p className="gem-hunt-webxr__subhint">
                כוונו את המצלמה למדרכה ליד הרגליים. אפשר גם להקיש על המסך כדי להניח.
              </p>
            ) : (
              <p className="gem-hunt-webxr__subhint">סובבו את הגוף והטלפון — כמו חפץ אמיתי במרחב.</p>
            )}
            <div className="gem-hunt-webxr__actions">
              {canCollect ? (
                <button
                  type="button"
                  className="gem-hunt-webxr__collect"
                  onClick={handleCollect}
                  disabled={phase === "collecting"}
                >
                  {phase === "collecting" ? "אוספים…" : "אספו את החבר!"}
                </button>
              ) : placed && !inCollectBand ? (
                <p className="gem-hunt-webxr__range-warn">
                  התקרבו ל־{GEM_HUNT_METERS} מ׳ ליהלום כדי לאסוף
                </p>
              ) : null}
              {onFallbackCamera ? (
                <button type="button" className="gem-hunt-webxr__fallback" onClick={onFallbackCamera}>
                  מצב מצלמה (מסך)
                </button>
              ) : null}
            </div>
          </>
        )}
      </footer>
    </div>
  );

  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}
