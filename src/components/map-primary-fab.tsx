"use client";

import { MapAddHouseFab } from "@/components/map-add-house-fab";
import { MapGemHuntFab } from "@/components/map-gem-hunt-fab";
import { useAppNow } from "@/hooks/use-app-clock";
import { isAddHouseOpen } from "@/lib/hours";

export function MapPrimaryFab({
  gemHuntEnabled,
  onGemPress,
  nearGem,
  gemDisabled,
}: {
  gemHuntEnabled: boolean;
  onGemPress: () => void;
  nearGem: boolean;
  gemDisabled?: boolean;
}) {
  const now = useAppNow();
  if (isAddHouseOpen(now)) return <MapAddHouseFab />;
  if (!gemHuntEnabled) return null;
  return <MapGemHuntFab onClick={onGemPress} nearGem={nearGem} disabled={gemDisabled} />;
}
