import { normalizeHolderName, normalizeIsraeliMobile } from "@/lib/house-access-code";
import { toPublicHouse } from "@/lib/ids";
import { isValidOwnerPhone, normalizeOwnerPhone } from "@/lib/owner-phone";
import { registerHouseAccessDevice, type RedeemOutcome } from "@/lib/night-pass-service";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { currentNightPass, readNightPassCookie, setNightPassCookie } from "@/lib/night-pass-session";
import { ownerHouseIds, ownerMayEdit } from "@/lib/owner-session";
import { getHouse, updateByEditCode } from "@/lib/store";
import { canonicalHouseId } from "@/lib/ids";

export type OwnerDeviceConnectOutcome =
  | { connected: true; houseId: string }
  | {
      connected: false;
      reason: "disabled" | "already" | "no_owner_houses" | "missing_contact" | "register_failed";
      needsRegistration?: boolean;
      houseId?: string;
    };

export type OwnerRegisterPrefill = {
  eligible: boolean;
  houseId?: string;
  houseName?: string;
  name?: string;
  phone?: string;
};

function mobileForNightPass(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const direct =
    normalizeIsraeliMobile(trimmed) ?? normalizeIsraeliMobile(normalizeOwnerPhone(trimmed));
  if (direct) return direct;
  if (!isValidOwnerPhone(trimmed)) return "";
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("972")) digits = `0${digits.slice(3)}`;
  return normalizeIsraeliMobile(digits) ?? "";
}

function contactFromHouse(house: { addedBy?: string | null; ownerPhone?: string | null }) {
  const name = normalizeHolderName(house.addedBy ?? "") ?? "";
  const phone = mobileForNightPass(String(house.ownerPhone ?? ""));
  return { name, phone };
}

export async function ownerRegisterPrefill(preferredHouseId?: string): Promise<OwnerRegisterPrefill> {
  const settings = await readNightPassSettings();
  if (!settings.enabled) return { eligible: false };

  const owned = await ownerHouseIds();
  if (owned.length === 0) return { eligible: false };

  const prefer = preferredHouseId ? canonicalHouseId(preferredHouseId) : "";
  const order =
    prefer && owned.some((id) => canonicalHouseId(id) === prefer)
      ? [prefer, ...owned.filter((id) => canonicalHouseId(id) !== prefer)]
      : owned;

  for (const rawId of order) {
    const id = canonicalHouseId(rawId);
    if (!(await ownerMayEdit(id))) continue;
    const house = await getHouse(id);
    if (!house) continue;
    const { name, phone } = contactFromHouse(house);
    return {
      eligible: true,
      houseId: house.id,
      houseName: house.name,
      name,
      phone,
    };
  }
  return { eligible: false };
}

async function patchHouseContactIfMissing(
  houseId: string,
  editCode: string,
  name: string,
  phone: string,
) {
  const house = await getHouse(houseId);
  if (!house) return;
  const patch: { addedBy?: string; ownerPhone?: string } = {};
  if (!normalizeHolderName(house.addedBy ?? "") && name) {
    patch.addedBy = name;
  }
  if (!normalizeIsraeliMobile(house.ownerPhone ?? "") && phone) {
    patch.ownerPhone = normalizeOwnerPhone(phone);
  }
  if (Object.keys(patch).length === 0) return;
  await updateByEditCode(houseId, editCode, patch);
}

/** Register owner device and backfill missing house contact fields from the form. */
export async function registerOwnerDeviceWithContact(input: {
  houseId: string;
  name: string;
  phone: string;
}): Promise<
  | (Extract<RedeemOutcome, { ok: true }> & {
      houseId: string;
      editCode: string;
      house: ReturnType<typeof toPublicHouse>;
    })
  | { ok: false; error: string }
> {
  const settings = await readNightPassSettings();
  if (!settings.enabled) return { ok: false, error: "disabled" };

  const id = canonicalHouseId(input.houseId);
  if (!(await ownerMayEdit(id))) return { ok: false, error: "forbidden" };

  const name = normalizeHolderName(input.name);
  const phone = normalizeIsraeliMobile(input.phone);
  if (!name) return { ok: false, error: "name" };
  if (!phone) return { ok: false, error: "phone" };

  const house = await getHouse(id);
  if (!house?.editCode?.trim()) return { ok: false, error: "invalid" };

  if (await currentNightPass()) {
    return { ok: false, error: "already" };
  }

  const cookie = await readNightPassCookie();
  const outcome = await registerHouseAccessDevice({
    houseId: house.id,
    name,
    phone,
    priorSessionId: cookie?.sessionId ?? null,
  });
  if (!outcome.ok) return { ok: false, error: outcome.error };

  await patchHouseContactIfMissing(house.id, house.editCode, name, phone);
  await setNightPassCookie(outcome.record.id, outcome.sessionId, outcome.token);

  const updated = (await getHouse(house.id)) ?? house;
  return {
    ...outcome,
    houseId: updated.id,
    editCode: updated.editCode,
    house: toPublicHouse(updated),
  };
}

/** Register this device for event access using owner-unlocked houses (name + mobile on file). */
export async function tryConnectOwnerDeviceForEvent(): Promise<OwnerDeviceConnectOutcome> {
  const settings = await readNightPassSettings();
  if (!settings.enabled) return { connected: false, reason: "disabled" };
  if (await currentNightPass()) return { connected: false, reason: "already" };

  const owned = await ownerHouseIds();
  if (owned.length === 0) return { connected: false, reason: "no_owner_houses" };

  const cookie = await readNightPassCookie();
  let missingContactHouseId: string | undefined;
  let sawCompleteContact = false;
  for (const id of owned) {
    const house = await getHouse(id);
    if (!house) continue;
    const { name, phone } = contactFromHouse(house);
    if (!name || !phone) {
      missingContactHouseId = missingContactHouseId ?? house.id;
      continue;
    }
    sawCompleteContact = true;
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
  if (missingContactHouseId) {
    return {
      connected: false,
      reason: "missing_contact",
      needsRegistration: true,
      houseId: missingContactHouseId,
    };
  }
  return {
    connected: false,
    reason: sawCompleteContact ? "register_failed" : "no_owner_houses",
  };
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
  const { name, phone } = contactFromHouse(house);
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
