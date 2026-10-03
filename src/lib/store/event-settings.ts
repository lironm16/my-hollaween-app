import {
  addressRevealScheduleFromDb,
  defaultAddressRevealSchedule,
  mergeAddressRevealSchedule,
  normalizeAddressRevealSchedule,
} from "@/lib/event-settings";
import type { AddressRevealSchedule } from "@/lib/types";
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
      updatedAt: new Date().toISOString(),
      addressReveal,
    };
    db.updatedAt = new Date().toISOString();
  });
  return getAdminAddressRevealSettings();
}

export async function clearAdminAddressRevealSchedule(): Promise<AdminAddressRevealSettings> {
  await runSyncedWrite((db) => {
    db.eventSettings = { updatedAt: new Date().toISOString() };
    db.updatedAt = new Date().toISOString();
  });
  return getAdminAddressRevealSettings();
}

/** Convenience for server routes that redact a single house row. */
export async function loadAddressRevealSchedule(): Promise<AddressRevealSchedule> {
  const db = await loadDb();
  return mergeAddressRevealSchedule(db.eventSettings?.addressReveal);
}
