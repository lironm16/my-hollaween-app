"use client";

import { ImpDemonCameraIcon } from "@/components/imp-demon-camera-icon";
import { useAddHouseOpen } from "@/hooks/use-add-house-open";
import { GEM_MAP_TOGGLE_HIDE_HE, GEM_MAP_TOGGLE_SHOW_HE } from "@/lib/gem-hunt-copy";
import { cn } from "@/lib/utils";

const fabClass =
  "map-demon-cam-fab inline-flex size-14 items-center justify-center rounded-2xl bg-[#1d1028] p-1.5 text-orange-100 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-orange-500/30 hover:bg-[#261536]";

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
  const addHouseOpen = useAddHouseOpen();

  if (!gemUi || addHouseOpen) return null;

  return (
    <button
      type="button"
      className={cn(fabClass, active && "bg-orange-500 ring-orange-300/50", nearSignal && "is-gem-near")}
      aria-label={active ? GEM_MAP_TOGGLE_HIDE_HE : GEM_MAP_TOGGLE_SHOW_HE}
      aria-pressed={active}
      title={active ? GEM_MAP_TOGGLE_HIDE_HE : GEM_MAP_TOGGLE_SHOW_HE}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <ImpDemonCameraIcon signalActive={nearSignal} className="size-10" />
    </button>
  );
}
