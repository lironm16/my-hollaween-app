"use client";

import { ImpDemonCameraIcon } from "@/components/imp-demon-camera-icon";
import { useAddHouseFabVisible } from "@/hooks/use-add-house-fab-visible";
import { GEM_MAP_TOGGLE_HIDE_HE, GEM_MAP_TOGGLE_SHOW_HE } from "@/lib/gem-hunt-copy";
import { cn } from "@/lib/utils";

const fabBase =
  "map-demon-cam-fab inline-flex size-14 shrink-0 items-center justify-center rounded-full p-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]";

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
      className={cn(
        fabBase,
        active
          ? "bg-orange-500 text-white ring-1 ring-orange-300/50"
          : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25 hover:bg-[#261536]",
        nearSignal && "is-gem-near",
      )}
      aria-label={active ? GEM_MAP_TOGGLE_HIDE_HE : GEM_MAP_TOGGLE_SHOW_HE}
      aria-pressed={active}
      title={active ? GEM_MAP_TOGGLE_HIDE_HE : GEM_MAP_TOGGLE_SHOW_HE}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <ImpDemonCameraIcon signalActive={nearSignal} className="size-8 max-h-full max-w-full" />
    </button>
  );
}
