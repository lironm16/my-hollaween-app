import { normalizeHolderName, normalizeIsraeliMobile } from "@/lib/house-access-code";
import type { NightPassClientBrowser, NightPassClientSurface } from "@/lib/night-pass-client-surface";
import { toPublicHouse } from "@/lib/ids";
import { isValidOwnerPhone, normalizeOwnerPhone } from "@/lib/owner-phone";
import type { HouseAccessRole } from "@/lib/house-access-role";
import {
  houseAccessSessionForDevice,
  registerHouseAccessDevice,
  type RedeemOutcome,
} from "@/lib/night-pass-service";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { currentNightPass, readNightPassCookie, setNightPassCookie } from "@/lib/night-pass-session";
import { ownerHouseIds, ownerMayEdit } from "@/lib/owner-session";
import { getHouse } from "@/lib/store";
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
  /** Name + mobile on file — user confirms in popup instead of silent register. */
  contactComplete?: boolean;
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

  async function prefillForHouse(rawId: string): Promise<OwnerRegisterPrefill> {
    const id = canonicalHouseId(rawId);
    if (!id || !(await ownerMayEdit(id))) return { eligible: false };
    const house = await getHouse(id);
    if (!house) return { eligible: false };
    const { name, phone } = contactFromHouse(house);
    return {
      eligible: true,
      houseId: house.id,
      houseName: house.name,
      name,
      phone,
      contactComplete: Boolean(name && phone),
    };
  }

  /** Device / edit screen picked a house — never substitute another owned home. */
  if (prefer) {
    return prefillForHouse(prefer);
  }

  for (const rawId of owned) {
    const result = await prefillForHouse(rawId);
    if (result.eligible) return result;
  }
  return { eligible: false };
}

/** Register owner device (does not change house contact on file). */
export async function registerOwnerDeviceWithContact(input: {
  houseId: string;
  name: string;
  phone: string;
  clientSurface?: NightPassClientSurface;
  clientBrowser?: NightPassClientBrowser;
  role?: HouseAccessRole;
}): Promise<
  | (Extract<RedeemOutcome, { ok: true }> & {
      houseId: string;
      editCode: string;
      house: ReturnType<typeof toPublicHouse>;
    })
  | { ok: false; error: string | "full" | "duplicate_identity" }
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
    clientSurface: input.clientSurface,
    clientBrowser: input.clientBrowser,
    role: input.role ?? "owner",
  });
  if (!outcome.ok) return { ok: false, error: outcome.error as string | "full" | "duplicate_identity" };

  await setNightPassCookie(outcome.record.id, outcome.sessionId, outcome.token);

  const updated = (await getHouse(house.id)) ?? house;
  return {
    ...outcome,
    houseId: updated.id,
    editCode: updated.editCode,
    house: toPublicHouse(updated),
  };
}

/**
 * Owner unlocked a house — never register silently; client opens confirm popup.
 */
export async function tryConnectOwnerDeviceForEvent(): Promise<OwnerDeviceConnectOutcome> {
  const settings = await readNightPassSettings();
  if (!settings.enabled) return { connected: false, reason: "disabled" };
  if (await currentNightPass()) return { connected: false, reason: "already" };

  const prefill = await ownerRegisterPrefill();
  if (!prefill.eligible || !prefill.houseId) {
    return { connected: false, reason: "no_owner_houses" };
  }

  return {
    connected: false,
    reason: "missing_contact",
    needsRegistration: true,
    houseId: prefill.houseId,
  };
}

/**
 * After POST /api/houses — register this device on the new house using the creator
 * name/phone from the form (night passes on, no existing pass on device).
 */
export async function autoRegisterCreatorDeviceAfterHouseCreate(input: {
  houseId: string;
  name: string;
  phone: string;
  clientSurface?: NightPassClientSurface;
  clientBrowser?: NightPassClientBrowser;
}): Promise<boolean> {
  if (!(await readNightPassSettings()).enabled) return false;
  if (await currentNightPass()) return false;

  const outcome = await registerOwnerDeviceWithContact({
    houseId: input.houseId,
    name: input.name,
    phone: input.phone,
    clientSurface: input.clientSurface,
    clientBrowser: input.clientBrowser,
    role: "owner",
  });
  return outcome.ok;
}

/** Unlock — true only if this device already has a pass slot on the house. */
export async function tryConnectOwnerDeviceForHouse(
  houseId: string,
  options?: { allowWhenDisabled?: boolean },
): Promise<boolean> {
  const settings = await readNightPassSettings();
  if (!settings.enabled && !options?.allowWhenDisabled) return false;
  const pass = await currentNightPass();
  if (!pass) return false;
  if (canonicalHouseId(pass.houseId) !== canonicalHouseId(houseId)) return false;
  const cookie = await readNightPassCookie();
  if (!cookie) return false;
  return Boolean(houseAccessSessionForDevice(pass, cookie.sessionId, cookie.token));
}
