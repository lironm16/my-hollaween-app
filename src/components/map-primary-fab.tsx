"use client";

import { MapAddHouseFab } from "@/components/map-add-house-fab";
import { MapGemHuntFab } from "@/components/map-gem-hunt-fab";
import { useAppNow } from "@/hooks/use-app-clock";
import { isAddHouseOpen } from "@/lib/hours";
import type { GemFabGlow } from "@/lib/gem-hunt-target";

export function MapPrimaryFab({
  gemHuntEnabled,
  onGemPress,
  gemGlow,
  gemDisabled,
  gemCollectedCount = 0,
}: {
  gemHuntEnabled: boolean;
  onGemPress: () => void;
  gemGlow: GemFabGlow;
  gemDisabled?: boolean;
  gemCollectedCount?: number;
}) {
  const now = useAppNow();
  if (isAddHouseOpen(now)) return <MapAddHouseFab />;
  if (!gemHuntEnabled) return null;
  return (
    <MapGemHuntFab
      onClick={onGemPress}
      glow={gemGlow}
      disabled={gemDisabled}
      collectedCount={gemCollectedCount}
    />
  );
}
