"use client";

import { useCallback, useEffect, useState } from "react";
import { GemHuntBootShell } from "@/components/gem-hunt/gem-hunt-boot-shell";
import { GemHuntOverlayLazy } from "@/components/gem-hunt/gem-hunt-lazy";
import { GemHuntWebXrArLazy } from "@/components/gem-hunt/gem-hunt-lazy";
import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";
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
  encounterMode?: boolean;
  repeatVisit?: boolean;
  /** Android: session started on the same tap as «התחילו מפגש» (avoids second AR button). */
  initialWebXrSession?: XRSession | null;
  onClose: () => void;
  onCollect: (monsterId: GemMonsterId, options?: GemCollectFinishOptions) => void;
};

/**
 * Android Chrome: immersive WebXR when hit-test AR is available.
 * iOS and fallback: camera pseudo-AR overlay.
 */
export function GemHuntExperience(props: GemHuntExperienceProps) {
  const [path, setPath] = useState<"pending" | "webxr" | "camera">(() => {
    if (props.initialWebXrSession && !isAndroidLike()) return "webxr";
    return "pending";
  });

  useEffect(() => {
    if (props.initialWebXrSession && !isAndroidLike()) {
      setPath("webxr");
      return;
    }
    let cancelled = false;
    /** Android: full-screen getUserMedia hunt (same as iOS). WebXR dom-overlay left the map visible. */
    if (isAndroidLike()) {
      setPath("camera");
      return;
    }
    setPath("camera");
    void supportsWebXrHitTestAr().then((ok) => {
      if (!cancelled && ok) setPath("webxr");
    });
    return () => {
      cancelled = true;
    };
  }, [props.initialWebXrSession]);

  const onWebXrFallback = useCallback(() => setPath("camera"), []);

  if (path === "pending") return <GemHuntBootShell />;

  if (path === "webxr") {
    return (
      <GemHuntWebXrArLazy
        house={props.house}
        userLocation={props.userLocation}
        simulateInRange={props.simulateInRange}
        collectEnabled={props.collectEnabled ?? true}
        encounterMode={props.encounterMode ?? true}
        repeatVisit={props.repeatVisit ?? false}
        initialWebXrSession={props.initialWebXrSession ?? null}
        onClose={props.onClose}
        onCollect={props.onCollect}
        onFallbackCamera={onWebXrFallback}
      />
    );
  }

  return <GemHuntOverlayLazy {...props} />;
}
