"use client";

import { ImpDemonCameraIcon } from "@/components/imp-demon-camera-icon";
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
  targetHeadline,
  onOpenHunt,
}: {
  gemUi: boolean;
  /** True while the map hunt camera session is open. */
  huntOpen: boolean;
  nearSignal: boolean;
  /** House / cluster line above the FAB (map hunt target). */
  targetHeadline?: string | null;
  onOpenHunt: () => void;
}) {
  const addHouseOpen = useAddHouseFabVisible();

  if (!gemUi || addHouseOpen) return null;

  const showLabel = Boolean(targetHeadline?.trim()) && (nearSignal || huntOpen);

  return (
    <div className="map-demon-cam-fab-stack" dir="rtl">
      {showLabel ? (
        <p className="map-demon-cam-fab-stack__label pointer-events-none" aria-hidden>
          {targetHeadline}
        </p>
      ) : null}
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
        <ImpDemonCameraIcon variant="fab" />
      </button>
    </div>
  );
}
