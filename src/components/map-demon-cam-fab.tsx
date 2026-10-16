"use client";

import { ImpDemonFilledIcon } from "@/components/imp-demon-reference-icon";
import { useAddHouseFabVisible } from "@/hooks/use-add-house-fab-visible";
import { GEM_MAP_CAM_FAB_CLOSE_HE, GEM_MAP_CAM_FAB_OPEN_HE } from "@/lib/gem-hunt-copy";
import { cn } from "@/lib/utils";

/** Match {@link MapAddHouseFab} outer geometry (size-14 circle); visuals in CSS (3D gem disc). */
const fabBase =
  "map-demon-cam-fab inline-flex size-14 shrink-0 items-center justify-center rounded-full";

/** Same map corner as {@link MapAddHouseFab} — visible when add-house FAB is hidden and gem hunt UI is on. */
export function MapDemonCamFab({
  gemUi,
  huntOpen,
  nearSignal,
  onOpenHunt,
}: {
  gemUi: boolean;
  /** True while the map hunt camera session is open. */
  huntOpen: boolean;
  nearSignal: boolean;
  onOpenHunt: () => void;
}) {
  const addHouseOpen = useAddHouseFabVisible();

  if (!gemUi || addHouseOpen) return null;

  return (
    <button
      type="button"
      className={cn(fabBase, huntOpen && "is-active", nearSignal && "is-near")}
      aria-label={huntOpen ? GEM_MAP_CAM_FAB_CLOSE_HE : GEM_MAP_CAM_FAB_OPEN_HE}
      aria-pressed={huntOpen}
      title={huntOpen ? GEM_MAP_CAM_FAB_CLOSE_HE : GEM_MAP_CAM_FAB_OPEN_HE}
      onClick={(event) => {
        event.stopPropagation();
        onOpenHunt();
      }}
    >
      <ImpDemonFilledIcon className="map-demon-cam-fab__glyph size-8 text-amber-300" aria-hidden />
    </button>
  );
}
