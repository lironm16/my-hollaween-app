import { writeRehearsalScene, writeServerSimDown } from "@/lib/app-clock";
import { writeHouseSet } from "@/lib/house-set";

/** Clear manager-only client settings after logout (rehearsal clock, server sim, house set). */
export function resetManagerClientSettings() {
  writeRehearsalScene("off");
  writeServerSimDown(false);
  writeHouseSet("real");
}
