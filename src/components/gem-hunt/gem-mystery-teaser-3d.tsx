"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

/** Spinning gem crystal — no pet GLB (hidden hunt teaser). */
export function GemMysteryTeaser3D({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const sizePx = 88;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(0, 0.15, 2.4);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(sizePx, sizePx);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const key = new THREE.DirectionalLight(0xffe7ba, 1.35);
    key.position.set(2, 2.5, 3);
    const rim = new THREE.DirectionalLight(0xc4b5fd, 0.9);
    rim.position.set(-2, 0.5, -2);
    scene.add(ambient, key, rim);

    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.72, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0x7c2d12,
        emissiveIntensity: 0.35,
        metalness: 0.35,
        roughness: 0.28,
        flatShading: true,
      }),
    );
    gem.rotation.x = 0.35;
    scene.add(gem);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.08, 32),
      new THREE.MeshBasicMaterial({
        color: 0xfde68a,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.55;
    scene.add(halo);

    let disposed = false;
    const start = performance.now();
    const tick = () => {
      if (disposed) return;
      rafRef.current = requestAnimationFrame(tick);
      if (document.visibilityState === "hidden") return;
      const t = (performance.now() - start) / 1000;
      gem.rotation.y = t * 1.65;
      gem.rotation.z = Math.sin(t * 2.4) * 0.18;
      gem.position.y = Math.sin(t * 3.1) * 0.08;
      const pulse = 1 + Math.sin(t * 5) * 0.06;
      gem.scale.setScalar(pulse);
      halo.scale.setScalar(0.92 + Math.sin(t * 4) * 0.06);
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      gem.geometry.dispose();
      (gem.material as THREE.Material).dispose();
      halo.geometry.dispose();
      (halo.material as THREE.Material).dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={cn("gem-mystery-teaser-3d", className)}
      aria-hidden
    />
  );
}
