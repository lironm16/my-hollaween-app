"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { gemMonsterMeta, gemMonsterTint, type GemMonsterId } from "@/lib/gem-monsters";
import { cn } from "@/lib/utils";

type Props = {
  monsterId?: GemMonsterId;
  houseId?: string;
  size?: "sm" | "lg";
  className?: string;
  collected?: boolean;
  interactive?: boolean;
};

export function GemModel3D({
  monsterId = "dragon",
  houseId = "default",
  size = "lg",
  className,
  collected = false,
  interactive = true,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const meta = gemMonsterMeta(monsterId);
    const width = host.clientWidth || (size === "sm" ? 52 : 120);
    const height = host.clientHeight || (size === "sm" ? 52 : 120);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 2.4);

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

    const root = new THREE.Group();
    scene.add(root);

    let model: THREE.Object3D | null = null;
    const tint = gemMonsterTint(houseId);
    const loader = new GLTFLoader();
    let disposed = false;

    loader.load(
      meta.glbPath,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        model.scale.setScalar(size === "sm" ? 0.55 : 0.85);
        model.position.y = -0.35;

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

        root.add(model);
      },
      undefined,
      () => {
        /* fallback: empty scene */
      },
    );

    const start = performance.now();
    const tick = () => {
      if (disposed) return;
      const t = (performance.now() - start) / 1000;
      root.rotation.y = t * (interactive ? 0.7 : 0.35);
      root.position.y = Math.sin(t * 2) * 0.06;
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      disposed = true;
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
  }, [monsterId, houseId, size, interactive]);

  return (
    <div
      ref={hostRef}
      className={cn(
        "gem-model-3d",
        size === "sm" && "gem-model-3d--sm",
        collected && "is-collected",
        className,
      )}
      aria-hidden
    />
  );
}
