import {
  addHouseCutoffScheduleFromDb,
  addressRevealScheduleFromDb,
  defaultAddHouseCutoffSchedule,
  defaultAddressRevealSchedule,
  countdownBannerFromDb,
  gemHuntPublicFromDb,
  mergeAddressRevealSchedule,
  normalizeAddHouseCutoffSchedule,
  normalizeAddressRevealSchedule,
  defaultEventOpenHoursSchedule,
  eventOpenHoursScheduleFromDb,
  normalizeEventOpenHoursSchedule,
} from "@/lib/event-settings";
import { parseClockMinutes } from "@/lib/hours";
import { firestoreConfigured, readFirestoreEventSettings } from "@/lib/firestore-db";
import type {
  AddHouseCutoffSchedule,
  AddressRevealSchedule,
  DbFile,
  EventOpenHoursSchedule,
} from "@/lib/types";
import { getGlobalDb, getMem, loadDb, runSyncedWrite } from "./core";

export type AdminAddressRevealSettings = {
  addressReveal: AddressRevealSchedule;
  customized: boolean;
  defaults: AddressRevealSchedule;
  updatedAt?: string;
};

export async function getAdminAddressRevealSettings(): Promise<AdminAddressRevealSettings> {
  const db = await loadDb();
  const defaults = defaultAddressRevealSchedule();
  const override = db.eventSettings?.addressReveal;
  return {
    addressReveal: addressRevealScheduleFromDb(db.eventSettings),
    customized: Boolean(override),
    defaults,
    updatedAt: db.eventSettings?.updatedAt,
  };
}

export async function saveAdminAddressRevealSchedule(input: {
  hour: number;
  minute: number;
}): Promise<AdminAddressRevealSettings> {
  const addressReveal = normalizeAddressRevealSchedule(input);
  await runSyncedWrite((db) => {
    db.eventSettings = {
      ...(db.eventSettings ?? {}),
      updatedAt: new Date().toISOString(),
      addressReveal,
    };
    db.updatedAt = new Date().toISOString();
  });
  return getAdminAddressRevealSettings();
}

export async function clearAdminAddressRevealSchedule(): Promise<AdminAddressRevealSettings> {
  await runSyncedWrite((db) => {
    const prev = db.eventSettings ?? {};
    const { addressReveal: _drop, ...keep } = prev;
    db.eventSettings =
      keep.addHouseCutoff || keep.gemHuntPublic === true || Object.keys(keep).length > 1
        ? { ...keep, updatedAt: new Date().toISOString() }
        : { updatedAt: new Date().toISOString() };
    db.updatedAt = new Date().toISOString();
  });
  return getAdminAddressRevealSettings();
}

export type AdminAddHouseCutoffSettings = {
  addHouseCutoff: AddHouseCutoffSchedule;
  customized: boolean;
  defaults: AddHouseCutoffSchedule;
  updatedAt?: string;
};

export async function getAdminAddHouseCutoffSettings(): Promise<AdminAddHouseCutoffSettings> {
  const db = await loadDb();
  const defaults = defaultAddHouseCutoffSchedule();
  const override = db.eventSettings?.addHouseCutoff;
  return {
    addHouseCutoff: addHouseCutoffScheduleFromDb(db.eventSettings),
    customized: Boolean(override),
    defaults,
    updatedAt: db.eventSettings?.updatedAt,
  };
}

export async function saveAdminAddHouseCutoffSchedule(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): Promise<AdminAddHouseCutoffSettings> {
  const addHouseCutoff = normalizeAddHouseCutoffSchedule(input);
  await runSyncedWrite((db) => {
    db.eventSettings = {
      ...(db.eventSettings ?? {}),
      updatedAt: new Date().toISOString(),
      addHouseCutoff,
    };
    db.updatedAt = new Date().toISOString();
  });
  return getAdminAddHouseCutoffSettings();
}

export async function clearAdminAddHouseCutoffSchedule(): Promise<AdminAddHouseCutoffSettings> {
  await runSyncedWrite((db) => {
    const prev = db.eventSettings ?? {};
    const { addHouseCutoff: _drop, ...keep } = prev;
    db.eventSettings =
      keep.addressReveal || keep.gemHuntPublic === true || Object.keys(keep).length > 1
        ? { ...keep, updatedAt: new Date().toISOString() }
        : { updatedAt: new Date().toISOString() };
    db.updatedAt = new Date().toISOString();
  });
  return getAdminAddHouseCutoffSettings();
}

export type AdminGemHuntPublicSettings = {
  enabled: boolean;
  updatedAt?: string;
};

export async function getAdminGemHuntPublicSettings(): Promise<AdminGemHuntPublicSettings> {
  const db = await loadDb();
  return {
    enabled: gemHuntPublicFromDb(db.eventSettings),
    updatedAt: db.eventSettings?.updatedAt,
  };
}

export async function saveAdminGemHuntPublicSettings(enabled: boolean): Promise<AdminGemHuntPublicSettings> {
  await runSyncedWrite((db) => {
    const prev = db.eventSettings ?? {};
    const next: NonNullable<DbFile["eventSettings"]> = {
      ...prev,
      updatedAt: new Date().toISOString(),
    };
    if (enabled) {
      next.gemHuntPublic = true;
    } else {
      delete next.gemHuntPublic;
    }
    db.eventSettings = next;
    db.updatedAt = next.updatedAt!;
  });
  return getAdminGemHuntPublicSettings();
}

export type AdminCountdownBannerSettings = {
  enabled: boolean;
  updatedAt?: string;
};

export async function getAdminCountdownBannerSettings(): Promise<AdminCountdownBannerSettings> {
  const db = await loadDb();
  return {
    enabled: countdownBannerFromDb(db.eventSettings),
    updatedAt: db.eventSettings?.updatedAt,
  };
}

export async function saveAdminCountdownBannerSettings(
  enabled: boolean,
): Promise<AdminCountdownBannerSettings> {
  await runSyncedWrite((db) => {
    const prev = db.eventSettings ?? {};
    const next = { ...prev, updatedAt: new Date().toISOString() };
    if (enabled) {
      delete next.countdownBanner;
    } else {
      next.countdownBanner = false;
    }
    db.eventSettings = next;
    db.updatedAt = new Date().toISOString();
  });
  return getAdminCountdownBannerSettings();
}

/** Convenience for server routes that redact a single house row. */
export type AdminEventOpenHoursSettings = {
  eventOpenHours: EventOpenHoursSchedule;
  customized: boolean;
  defaults: EventOpenHoursSchedule;
  updatedAt?: string;
};

export async function getAdminEventOpenHoursSettings(): Promise<AdminEventOpenHoursSettings> {
  const db = await loadDb();
  const defaults = defaultEventOpenHoursSchedule();
  const override = db.eventSettings?.eventOpenHours;
  return {
    eventOpenHours: eventOpenHoursScheduleFromDb(db.eventSettings),
    customized: Boolean(override),
    defaults,
    updatedAt: db.eventSettings?.updatedAt,
  };
}

export async function saveAdminEventOpenHoursSchedule(input: {
  year: number;
  month: number;
  day: number;
  openFrom: string;
  openTo: string;
}): Promise<AdminEventOpenHoursSettings> {
  const eventOpenHours = normalizeEventOpenHoursSchedule(input);
  const fromMin = parseClockMinutes(eventOpenHours.openFrom);
  const toMin = parseClockMinutes(eventOpenHours.openTo);
  if (fromMin === null || toMin === null || toMin <= fromMin) {
    throw new Error("שעת הסיום חייבת להיות אחרי שעת ההתחלה.");
  }
  await runSyncedWrite((db) => {
    db.eventSettings = {
      ...(db.eventSettings ?? {}),
      updatedAt: new Date().toISOString(),
      eventOpenHours,
    };
    db.updatedAt = new Date().toISOString();
  });
  return getAdminEventOpenHoursSettings();
}

export async function clearAdminEventOpenHoursSchedule(): Promise<AdminEventOpenHoursSettings> {
  await runSyncedWrite((db) => {
    const prev = db.eventSettings ?? {};
    const { eventOpenHours: _drop, ...keep } = prev;
    db.eventSettings =
      keep.addressReveal ||
      keep.addHouseCutoff ||
      keep.gemHuntPublic === true ||
      keep.countdownBanner === false ||
      Object.keys(keep).length > 1
        ? { ...keep, updatedAt: new Date().toISOString() }
        : { updatedAt: new Date().toISOString() };
    db.updatedAt = new Date().toISOString();
  });
  return getAdminEventOpenHoursSettings();
}

export async function loadAddressRevealSchedule(): Promise<AddressRevealSchedule> {
  const mem = getMem();
  if (mem?.eventSettings?.addressReveal) {
    return mergeAddressRevealSchedule(mem.eventSettings.addressReveal);
  }
  const global = getGlobalDb();
  if (global?.eventSettings?.addressReveal) {
    return mergeAddressRevealSchedule(global.eventSettings.addressReveal);
  }
  if (firestoreConfigured()) {
    const remote = await readFirestoreEventSettings();
    if (remote?.addressReveal) return mergeAddressRevealSchedule(remote.addressReveal);
  }
  return mergeAddressRevealSchedule();
}
