import { writeRehearsalScene, writeServerSimDown } from "@/lib/app-clock";
import { DEFAULT_MAP_DISPLAY_LAYERS, writeMapDisplayLayers } from "@/lib/map-display-layers";

/** Clear manager-only client settings after logout (rehearsal clock, server sim, house set). */
export function resetManagerClientSettings() {
  writeRehearsalScene("off");
  writeServerSimDown(false);
  writeMapDisplayLayers({ ...DEFAULT_MAP_DISPLAY_LAYERS });
  try {
    localStorage.removeItem("hw-gem-lab-stubs");
  } catch {
    /* private mode */
  }
}
