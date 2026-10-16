import { normalizeHolderName, normalizeIsraeliMobile } from "@/lib/house-access-code";
import { registerHouseAccessDevice } from "@/lib/night-pass-service";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { currentNightPass, readNightPassCookie, setNightPassCookie } from "@/lib/night-pass-session";
import { ownerHouseIds } from "@/lib/owner-session";
import { getHouse } from "@/lib/store";

export type OwnerDeviceConnectOutcome =
  | { connected: true; houseId: string }
  | { connected: false; reason: "disabled" | "already" | "no_owner_houses" | "missing_contact" | "register_failed" };

/** Register this device for event access using owner-unlocked houses (name + mobile on file). */
export async function tryConnectOwnerDeviceForEvent(): Promise<OwnerDeviceConnectOutcome> {
  const settings = await readNightPassSettings();
  if (!settings.enabled) return { connected: false, reason: "disabled" };
  if (await currentNightPass()) return { connected: false, reason: "already" };

  const owned = await ownerHouseIds();
  if (owned.length === 0) return { connected: false, reason: "no_owner_houses" };

  const cookie = await readNightPassCookie();
  for (const id of owned) {
    const house = await getHouse(id);
    if (!house) continue;
    const phone = normalizeIsraeliMobile(house.ownerPhone ?? "");
    const name = normalizeHolderName(house.addedBy ?? "");
    if (!phone || !name) continue;
    const outcome = await registerHouseAccessDevice({
      houseId: house.id,
      name,
      phone,
      priorSessionId: cookie?.sessionId ?? null,
    });
    if (outcome.ok) {
      await setNightPassCookie(outcome.record.id, outcome.sessionId, outcome.token);
      return { connected: true, houseId: house.id };
    }
  }
  return { connected: false, reason: "missing_contact" };
}

/** Same as add-house auto-connect for one house row. */
export async function tryConnectOwnerDeviceForHouse(
  houseId: string,
  options?: { allowWhenDisabled?: boolean },
): Promise<boolean> {
  const settings = await readNightPassSettings();
  if (!settings.enabled && !options?.allowWhenDisabled) return false;
  if (await currentNightPass()) return true;
  const house = await getHouse(houseId);
  if (!house) return false;
  const phone = normalizeIsraeliMobile(house.ownerPhone ?? "");
  const name = normalizeHolderName(house.addedBy ?? "");
  if (!phone || !name) return false;
  const cookie = await readNightPassCookie();
  const outcome = await registerHouseAccessDevice({
    houseId: house.id,
    name,
    phone,
    priorSessionId: cookie?.sessionId ?? null,
  });
  if (!outcome.ok) return false;
  await setNightPassCookie(outcome.record.id, outcome.sessionId, outcome.token);
  return true;
}
