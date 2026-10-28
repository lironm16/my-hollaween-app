import { readApiJson } from "@/lib/api-json";
import { ownerPhoneValidationErrorLocalized } from "@/lib/i18n/owner-phone-i18n";
import { publishHouseClientError } from "@/lib/i18n/publish-house-errors";
import { defaultAppLocale, readStoredAppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";
import { houseHoursWindows, syncHoursFields } from "@/lib/hours";
import { normalizeOwnerPhone } from "@/lib/owner-phone";
import type { NightPassClientBrowser, NightPassClientSurface } from "@/lib/night-pass-client-surface";
import type { HouseInput, PublicHouse } from "@/lib/types";

export type PublishResult = {
  house: PublicHouse;
  editCode: string;
  deviceConnected?: boolean;
  autoPush?: boolean;
  pushTitle?: string;
  pushBody?: string;
};

function clock(value: string) {
  const match = /^(\d{2}:\d{2})/.exec(value.trim());
  return match ? match[1] : "17:00";
}

export function readyHouseInput(input: HouseInput): HouseInput {
  const hours = syncHoursFields(
    input.openHours?.length
      ? input.openHours.map((window) => ({
          from: clock(window.from),
          to: clock(window.to),
        }))
      : houseHoursWindows({
          ...input,
          openFrom: clock(input.openFrom),
          openTo: clock(input.openTo),
          openFrom2: input.openFrom2 ? clock(input.openFrom2) : "",
          openTo2: input.openTo2 ? clock(input.openTo2) : "",
        }),
  );
  return {
    ...input,
    arrival: input.arrival ?? "",
    description: input.description ?? "",
    notes: input.notes ?? "",
    treats: input.treats ?? [],
    treatStock: input.treatStock ?? {},
    visit: input.visit ?? "come",
    decorLevel: input.decorLevel,
    decorated: input.decorated,
    ...hours,
  };
}

/** Always posts to the server. Never keeps a house only on the phone. */
export async function publishHouse(
  input: HouseInput,
  options?: {
    includeEndpoint?: string;
    addedBy?: string;
    ownerPhone?: string;
    admin?: boolean;
    clientSurface?: NightPassClientSurface;
    clientBrowser?: NightPassClientBrowser;
  },
): Promise<PublishResult> {
  const locale = readStoredAppLocale() ?? defaultAppLocale();
  const body = readyHouseInput(input);
  const addedBy = options?.addedBy?.trim();
  if (!addedBy) throw new Error(translate(locale, "houseForm.needSubmitter"));
  const ownerPhoneRaw = options?.ownerPhone ?? input.ownerPhone ?? "";
  const phoneIssue = ownerPhoneValidationErrorLocalized(locale, String(ownerPhoneRaw), true);
  if (phoneIssue) throw new Error(phoneIssue);
  const ownerPhone = normalizeOwnerPhone(String(ownerPhoneRaw));
  const adminCreate = Boolean(options?.admin && body.kind === "poi");
  let res: Response;
  try {
    res = await fetch(adminCreate ? "/api/admin/houses" : "/api/houses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        addedBy,
        ownerPhone,
        includeEndpoint: options?.includeEndpoint,
        ...(options?.clientSurface ? { clientSurface: options.clientSurface } : {}),
        ...(options?.clientBrowser ? { clientBrowser: options.clientBrowser } : {}),
      }),
    });
  } catch {
    throw new Error(translate(locale, "add.publishNoConnection"));
  }
  const data = await readApiJson<{
    error?: string;
    code?: string;
    house?: PublicHouse;
    editCode?: string;
    push?: { autoSent?: boolean; title?: string; body?: string };
    deviceConnected?: boolean;
  }>(res);
  if (res.ok && data.house && data.editCode) {
    return {
      house: data.house,
      editCode: data.editCode,
      deviceConnected: Boolean(data.deviceConnected),
      autoPush: Boolean(data.push?.autoSent),
      pushTitle: data.push?.title,
      pushBody: data.push?.body,
    };
  }
  throw new Error(publishHouseClientError(locale, data));
}
