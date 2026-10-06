"use client";

import { useCallback, useEffect, useState } from "react";
import { GemHuntBootShell } from "@/components/gem-hunt/gem-hunt-boot-shell";
import { GemHuntOverlayLazy } from "@/components/gem-hunt/gem-hunt-lazy";
import { GemHuntWebXrArLazy } from "@/components/gem-hunt/gem-hunt-lazy";
import { isAndroidLike, supportsWebXrHitTestAr } from "@/lib/gem-hunt-ar-platform";
import type { GemCampusQueueUi, GemCollectFinishOptions } from "@/lib/gem-hunt";
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
  /** When true, «גלה לי» only works within hunt radius (visitors + admin «תצוגת משתמש»). */
  tellMeHuntRadiusEnforced?: boolean;
  /** Android: session started on the same tap as hunt open (avoids second AR button). */
  initialWebXrSession?: XRSession | null;
  onClose: () => void;
  onCollect: (monsterId: GemMonsterId, options?: GemCollectFinishOptions) => void;
  /** School campus — house name + דוכן in camera chrome. */
  campusQueue?: GemCampusQueueUi;
  /** Persist each catch immediately (before collect animation ends). */
  onCollectPersist?: (monsterId: GemMonsterId) => void;
  /** After short campus animation — advance to next booth or end session. */
  onCampusStepComplete?: (monsterId: GemMonsterId) => void;
};

/**
 * Android Chrome: immersive WebXR when hit-test AR is available.
 * iOS: camera pseudo-AR overlay (`getUserMedia`).
 */
export function GemHuntExperience(props: GemHuntExperienceProps) {
  const [path, setPath] = useState<"pending" | "webxr" | "camera">(() => {
    if (props.initialWebXrSession) return "webxr";
    return "pending";
  });

  useEffect(() => {
    if (props.initialWebXrSession) {
      setPath("webxr");
      return;
    }
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
        tellMeHuntRadiusEnforced={props.tellMeHuntRadiusEnforced ?? true}
        initialWebXrSession={props.initialWebXrSession ?? null}
        campusQueue={props.campusQueue}
        onCollectPersist={props.onCollectPersist}
        onCampusStepComplete={props.onCampusStepComplete}
        onClose={props.onClose}
        onCollect={props.onCollect}
        onFallbackCamera={onWebXrFallback}
      />
    );
  }

  return <GemHuntOverlayLazy {...props} />;
}
