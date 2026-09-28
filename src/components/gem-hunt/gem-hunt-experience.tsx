"use client";

import { GemHuntOverlayLazy } from "@/components/gem-hunt/gem-hunt-lazy";
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

/** Camera pseudo-AR on all phones (spin, collect, «גלה לי» on one on-screen gem). */
export function GemHuntExperience(props: GemHuntExperienceProps) {
  return <GemHuntOverlayLazy {...props} />;
}
