"use client";

import { ImpDemonCameraIcon } from "@/components/imp-demon-camera-icon";
import { useAddHouseFabVisible } from "@/hooks/use-add-house-fab-visible";
import { GEM_MAP_TOGGLE_HIDE_HE, GEM_MAP_TOGGLE_SHOW_HE } from "@/lib/gem-hunt-copy";
import { cn } from "@/lib/utils";

/** Match {@link MapAddHouseFab} outer geometry (size-14 circle); visuals in CSS (3D gem disc). */
const fabBase =
  "map-demon-cam-fab inline-flex size-14 shrink-0 items-center justify-center rounded-full";

/** Same map corner as {@link MapAddHouseFab} — visible when add-house FAB is hidden and gem hunt UI is on. */
export function MapDemonCamFab({
  gemUi,
  active,
  nearSignal,
  onToggle,
}: {
  gemUi: boolean;
  active: boolean;
  nearSignal: boolean;
  onToggle: () => void;
}) {
  const addHouseOpen = useAddHouseFabVisible();

  if (!gemUi || addHouseOpen) return null;

  return (
    <button
      type="button"
      className={cn(fabBase, active && "is-active", nearSignal && "is-near")}
      aria-label={active ? GEM_MAP_TOGGLE_HIDE_HE : GEM_MAP_TOGGLE_SHOW_HE}
      aria-pressed={active}
      title={active ? GEM_MAP_TOGGLE_HIDE_HE : GEM_MAP_TOGGLE_SHOW_HE}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <ImpDemonCameraIcon variant="fab" />
    </button>
  );
}
