"use client";

import { useCallback, useEffect, useState } from "react";
import { GemHuntOverlayLazy } from "@/components/gem-hunt/gem-hunt-lazy";
import { GemHuntWebXrArLazy } from "@/components/gem-hunt/gem-hunt-lazy";
import { isAndroidLike, supportsWebXrHitTestAr } from "@/lib/gem-hunt-ar-platform";
import type { GemCollectFinishOptions } from "@/lib/gem-hunt";
import type { GemMonsterId } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";
import type { UserLocation } from "@/hooks/use-user-location";

export type GemHuntExperienceProps = {
  house: PublicHouse;
  userLocation: UserLocation | null;
  simulateInRange?: boolean;
  deferCameraUntilInRange?: boolean;
  collectEnabled?: boolean;
  onClose: () => void;
  onCollect: (monsterId: GemMonsterId, options?: GemCollectFinishOptions) => void;
};

/**
 * Android Chrome: immersive WebXR when available. Everyone else (and fallback): camera pseudo-AR.
 */
export function GemHuntExperience(props: GemHuntExperienceProps) {
  const [path, setPath] = useState<"pending" | "webxr" | "camera">("pending");

  useEffect(() => {
    let cancelled = false;
    if (!isAndroidLike()) {
      setPath("camera");
      return;
    }
    void supportsWebXrHitTestAr().then((ok) => {
      if (!cancelled) setPath(ok ? "webxr" : "camera");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onWebXrFallback = useCallback(() => setPath("camera"), []);

  if (path === "pending") return null;

  if (path === "webxr") {
    return (
      <GemHuntWebXrArLazy
        house={props.house}
        userLocation={props.userLocation}
        simulateInRange={props.simulateInRange}
        collectEnabled={props.collectEnabled ?? true}
        onClose={props.onClose}
        onCollect={props.onCollect}
        onFallbackCamera={onWebXrFallback}
      />
    );
  }

  return <GemHuntOverlayLazy {...props} />;
}
