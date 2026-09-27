"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { gemMonsterMeta, gemMonsterTint, type GemMonsterId } from "@/lib/gem-monsters";
import { cn } from "@/lib/utils";

type Props = {
  houseId: string;
  monsterId: GemMonsterId;
  onClose: () => void;
};

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

/**
 * Android (Chrome): WebXR hit-test — place the GLB on a real surface and walk around it.
 */
export function GemHuntWebXrAr({ houseId, monsterId, onClose }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const meta = gemMonsterMeta(monsterId);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !navigator.xr) {
      setError("AR לא נתמך במכשיר זה");
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const supported = await navigator.xr!.isSessionSupported("immersive-ar");
      if (disposed) return;
      if (!supported) {
        setError("נדרש Chrome ב-Android עם AR");
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      host.appendChild(renderer.domElement);

      const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.1);
      scene.add(light);

      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.08, 0.11, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 }),
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      const anchorGroup = new THREE.Group();
      anchorGroup.visible = false;
      scene.add(anchorGroup);

      const tint = gemMonsterTint(houseId);
      const loader = new GLTFLoader();
      loader.load(
        meta.glbPath,
        (gltf) => {
          if (disposed) return;
          const model = gltf.scene;
          frameModel(model, 0.55);
          model.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;
            const mat = obj.material;
            if (!(mat instanceof THREE.MeshStandardMaterial)) return;
            mat.metalness = 0.05;
            mat.roughness = 0.55;
            mat.color.offsetHSL(tint.hue, tint.saturation, tint.lightness);
          });
          anchorGroup.add(model);
        },
        undefined,
        () => setError("לא הצלחנו לטעון את הדמות"),
      );

      const arButton = ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: { root: host },
      });
      arButton.className = "gem-hunt-webxr__start";
      host.appendChild(arButton);

      let hitTestSource: XRHitTestSource | null = null;
      let hitTestSourceRequested = false;

      const onSelect = () => {
        if (!reticle.visible) return;
        anchorGroup.position.setFromMatrixPosition(reticle.matrix);
        anchorGroup.quaternion.setFromRotationMatrix(reticle.matrix);
        anchorGroup.visible = true;
      };

      const onSessionStart = async () => {
        const session = renderer.xr.getSession();
        if (!session) return;
        session.addEventListener("select", onSelect);
        if (hitTestSourceRequested) return;
        hitTestSourceRequested = true;
        const viewerSpace = await session.requestReferenceSpace("viewer");
        const refSpace = await session.requestReferenceSpace("local");
        renderer.xr.setReferenceSpace(refSpace);
        hitTestSource = (await session.requestHitTestSource!({ space: viewerSpace })) ?? null;
        renderer.setAnimationLoop((_t, frame) => {
          if (!frame || !hitTestSource) return;
          const ref = renderer.xr.getReferenceSpace() ?? refSpace;
          const hits = frame.getHitTestResults(hitTestSource);
          if (hits.length > 0) {
            const pose = hits[0]!.getPose(ref);
            if (pose) {
              reticle.visible = true;
              reticle.matrix.fromArray(pose.transform.matrix);
            }
          } else {
            reticle.visible = false;
          }
          renderer.render(scene, camera);
        });
      };

      const onSessionEnd = () => {
        anchorGroup.visible = false;
        reticle.visible = false;
        renderer.setAnimationLoop(null);
      };

      renderer.xr.addEventListener("sessionstart", () => void onSessionStart());
      renderer.xr.addEventListener("sessionend", onSessionEnd);

      cleanup = () => {
        disposed = true;
        renderer.setAnimationLoop(null);
        renderer.dispose();
        arButton.remove();
        if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
        hitTestSource?.cancel?.();
      };
    })();

    return () => {
      cleanup?.();
    };
  }, [houseId, meta.glbPath, monsterId]);

  return (
    <div className={cn("gem-hunt-webxr")} dir="rtl">
      <div className="gem-hunt-webxr__bar">
        <p className="gem-hunt-webxr__title">AR — הניחו את הדמות על המדרכה</p>
        <button type="button" className="gem-hunt-webxr__close" onClick={onClose}>
          סגירה
        </button>
      </div>
      {error ? <p className="gem-hunt-webxr__error">{error}</p> : null}
      <div ref={hostRef} className="gem-hunt-webxr__host" />
      <p className="gem-hunt-webxr__hint">
        לחצו «Start AR», כוונו למדרכה, הקישו להנחה · הלכו מסביב לראות את כל הגוף
      </p>
    </div>
  );
}
