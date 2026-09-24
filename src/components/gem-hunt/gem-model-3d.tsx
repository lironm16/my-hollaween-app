"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { gemMonsterMeta, gemMonsterTint, type GemMonsterId } from "@/lib/gem-monsters";
import { cn } from "@/lib/utils";

type Props = {
  monsterId?: GemMonsterId;
  houseId?: string;
  size?: "sm" | "lg" | "fill";
  className?: string;
  collected?: boolean;
  interactive?: boolean;
  /** turntable = hunt overlay; orbit = drag to inspect (gem bag) */
  controls?: "turntable" | "orbit";
};

function frameModel(object: THREE.Object3D, scaleFactor: number) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scale = scaleFactor / maxDim;
  object.scale.setScalar(scale);
  object.position.sub(center.multiplyScalar(scale));
  object.position.y += size.y * scale * 0.06;
}

function fitCameraToPivot(
  camera: THREE.PerspectiveCamera,
  pivot: THREE.Object3D,
  padding = 1.55,
) {
  const box = new THREE.Box3().setFromObject(pivot);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const fovRad = (camera.fov * Math.PI) / 180;
  const dist = (maxDim / 2 / Math.tan(fovRad / 2)) * padding;
  camera.position.set(center.x, center.y + maxDim * 0.06, center.z + dist);
  camera.lookAt(center.x, center.y, center.z);
  camera.updateProjectionMatrix();
}

export function GemModel3D({
  monsterId = "dragon",
  houseId = "default",
  size = "lg",
  className,
  collected = false,
  interactive = true,
  controls = "turntable",
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const meta = gemMonsterMeta(monsterId);
    const defaultPx = size === "sm" ? 52 : size === "lg" ? 120 : 280;
    let width = host.clientWidth || defaultPx;
    let height = host.clientHeight || (size === "fill" ? 240 : defaultPx);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 2.6);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    const key = new THREE.DirectionalLight(0xffe7ba, 1.2);
    key.position.set(2, 3, 4);
    const rim = new THREE.DirectionalLight(0xc4b5fd, 0.65);
    rim.position.set(-2, 1, -3);
    scene.add(ambient, key, rim);

    const pivot = new THREE.Group();
    scene.add(pivot);

    let orbit: OrbitControls | null = null;
    if (controls === "orbit") {
      orbit = new OrbitControls(camera, renderer.domElement);
      orbit.enableDamping = true;
      orbit.dampingFactor = 0.08;
      orbit.minDistance = 0.8;
      orbit.maxDistance = 6;
      orbit.maxPolarAngle = Math.PI * 0.92;
      orbit.target.set(0, 0.05, 0);
    }

    let model: THREE.Object3D | null = null;
    const tint = gemMonsterTint(houseId);
    const loader = new GLTFLoader();
    let disposed = false;

    const scaleFactor =
      controls === "turntable"
        ? size === "sm"
          ? 0.55
          : 0.78
        : size === "sm"
          ? 0.55
          : size === "lg"
            ? 0.85
            : 1.35;

    loader.load(
      meta.glbPath,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        frameModel(model, scaleFactor);

        model.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          const mat = obj.material;
          if (!(mat instanceof THREE.MeshStandardMaterial)) return;
          mat.metalness = 0.05;
          mat.roughness = 0.55;
          if (interactive) {
            mat.color.offsetHSL(tint.hue, tint.saturation, tint.lightness);
          }
        });

        pivot.add(model);
        if (controls === "turntable") {
          fitCameraToPivot(camera, pivot, size === "sm" ? 1.45 : 1.65);
        } else {
          orbit?.update();
        }
      },
      undefined,
      () => {
        /* fallback: empty scene */
      },
    );

    const resizeObserver =
      size === "fill" && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (disposed || !host) return;
            width = host.clientWidth || width;
            height = host.clientHeight || height;
            if (width < 1 || height < 1) return;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
          })
        : null;
    resizeObserver?.observe(host);

    const start = performance.now();
    const tick = () => {
      if (disposed) return;
      const t = (performance.now() - start) / 1000;
      if (controls === "turntable") {
        pivot.rotation.y = t * (interactive ? 0.7 : 0.35);
        pivot.position.y = Math.sin(t * 2) * 0.04;
      } else {
        orbit?.update();
      }
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      orbit?.dispose();
      cancelAnimationFrame(rafRef.current);
      if (model) {
        model.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => m.dispose());
          }
        });
      }
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [monsterId, houseId, size, interactive, controls]);

  return (
    <div
      ref={hostRef}
      className={cn(
        "gem-model-3d",
        size === "sm" && "gem-model-3d--sm",
        size === "fill" && "gem-model-3d--fill",
        controls === "orbit" && "gem-model-3d--orbit",
        collected && "is-collected",
        className,
      )}
      aria-hidden={controls === "turntable"}
      role={controls === "orbit" ? "img" : undefined}
      aria-label={controls === "orbit" ? "תצוגת דוגמנית — גררו לסיבוב" : undefined}
    />
  );
}
