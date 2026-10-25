"use client";

import { GemHuntOverlayLazy } from "@/components/gem-hunt/gem-hunt-lazy";
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
  /** When true, **גלה לי** only works within hunt radius (visitors + admin **תצוגת משתמש**). */
  tellMeHuntRadiusEnforced?: boolean;
  /** @deprecated Android immersive WebXR disabled — ignored. */
  initialWebXrSession?: XRSession | null;
  onClose: () => void;
  onCollect: (monsterId: GemMonsterId, options?: GemCollectFinishOptions) => void;
  /** School campus — house name + דוכן in camera chrome. */
  campusQueue?: GemCampusQueueUi;
  /** Persist each catch immediately (before collect animation ends). */
  onCollectPersist?: (monsterId: GemMonsterId) => void;
  /** After short campus animation — advance to next booth or end session. */
  onCampusStepComplete?: (monsterId: GemMonsterId) => void;
  onClusterFinishSession?: () => void;
  onClusterSkipHouse?: () => void;
  clusterSkipAvailable?: boolean;
  clusterFinishAvailable?: boolean;
  /** Map roving hunt — pick closest gem before **גלה לי** / **רמז** (sticky until next tap). */
  onBeforeNavigationAssist?: () => void;
};

/** Camera pseudo-AR overlay (`getUserMedia` + inspect360) on all mobile browsers. */
export function GemHuntExperience(props: GemHuntExperienceProps) {
  return <GemHuntOverlayLazy {...props} />;
}
