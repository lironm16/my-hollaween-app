import {
  addHouseCutoffScheduleFromDb,
  addressRevealScheduleFromDb,
  defaultAddHouseCutoffSchedule,
  defaultAddressRevealSchedule,
  mergeAddressRevealSchedule,
  normalizeAddHouseCutoffSchedule,
  normalizeAddressRevealSchedule,
} from "@/lib/event-settings";
import type { AddHouseCutoffSchedule, AddressRevealSchedule } from "@/lib/types";
import { loadDb, runSyncedWrite } from "./core";

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
      keep.addHouseCutoff || Object.keys(keep).length > 1
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
      keep.addressReveal || Object.keys(keep).length > 1
        ? { ...keep, updatedAt: new Date().toISOString() }
        : { updatedAt: new Date().toISOString() };
    db.updatedAt = new Date().toISOString();
  });
  return getAdminAddHouseCutoffSettings();
}

/** Convenience for server routes that redact a single house row. */
export async function loadAddressRevealSchedule(): Promise<AddressRevealSchedule> {
  const db = await loadDb();
  return mergeAddressRevealSchedule(db.eventSettings?.addressReveal);
}
