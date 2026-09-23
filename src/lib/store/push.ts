import { pushAlertsEnabled } from "@/lib/push-enabled";
import type { PushSubscriptionRecord } from "@/lib/types";
import {
  ensureVapid,
  payloadForKind,
  sanitizePushPayload,
  sendPushToSubscriptions,
  type PushPayload,
} from "@/lib/push";
import { subscriptionAllowsTopic } from "@/lib/push-topics";
import { neighborhoodPushBroadcastAllowed } from "@/lib/push-policy";
import {
  AUTO_PUSH_KINDS,
  PUSH_KINDS,
  PUSH_TEMPLATES_STORAGE_GENERATION,
  buildDefaultPushSettings,
  houseMatchesNotifyKind,
  mergePushTemplates,
  type PushKind,
  type StoredPushSettings,
} from "@/lib/push-templates";
import {
  countFirestorePushSubscriptions,
  deleteFirestorePushSubscription,
  firestoreConfigured,
  readFirestorePushSubscription,
  writeFirestorePushSubscription,
  writeFirestoreVapid,
} from "@/lib/firestore-db";
import {
  ensurePushSettingsGeneration,
  getMem,
  loadDb,
  loadPushData,
  persistPushSettingsMigration,
  prepareDbFromSources,
  runSyncedWrite,
  setGlobalDb,
  setMem,
  setMemPushSubscriptions,
  setPushMemAt,
  setPushSettingsGenerationChecked,
  withLock,
  writePushSubsBlob,
} from "./core";
import { getHouse } from "./houses";

export async function getPushTemplateList() {
  await ensurePushSettingsGeneration();
  const db = await loadDb();
  return Object.values(mergePushTemplates(db.pushSettings));
}

export async function resetPushTemplates() {
  setPushSettingsGenerationChecked(false);
  await runSyncedWrite((db) => {
    db.pushSettings = buildDefaultPushSettings();
    db.updatedAt = new Date().toISOString();
  });
  setPushSettingsGenerationChecked(true);
  return getPushTemplateList();
}

export async function savePushTemplates(input: StoredPushSettings) {
  return withLock(async () => {
    const db = await prepareDbFromSources();
    const merged = mergePushTemplates({
      templates: {
        ...db.pushSettings?.templates,
        ...input.templates,
      },
    });
    const templates: NonNullable<StoredPushSettings["templates"]> = {};
    for (const id of PUSH_KINDS) {
      templates[id] = {
        enabled: merged[id].enabled,
        title: merged[id].title,
        body: merged[id].body,
      };
    }
    db.pushSettings = {
      updatedAt: new Date().toISOString(),
      generation: PUSH_TEMPLATES_STORAGE_GENERATION,
      templates,
    };
    db.updatedAt = new Date().toISOString();
    setPushSettingsGenerationChecked(true);
    await persistPushSettingsMigration(db);
    return Object.values(mergePushTemplates(db.pushSettings));
  });
}

export async function notifyHouseKind(options: {
  id: string;
  kind: PushKind;
  editCode?: string;
  admin?: boolean;
  ownerSession?: boolean;
  includeEndpoint?: string;
}) {
  const house = await getHouse(options.id);
  if (!house) return { error: "missing" as const };
  if (!options.admin && !options.ownerSession && house.editCode !== options.editCode) {
    return { error: "forbidden" as const };
  }
  if (AUTO_PUSH_KINDS.has(options.kind) && !options.admin) return { error: "auto" as const };
  if (!houseMatchesNotifyKind(house, options.kind)) return { error: "mismatch" as const };
  if (!neighborhoodPushBroadcastAllowed(options.kind)) return { error: "mapOnly" as const };
  const stored = (await loadDb()).pushSettings as StoredPushSettings | undefined;
  const payload = payloadForKind(options.kind, house, stored);
  if (!payload) return { error: "disabled" as const };
  const result = await broadcastPush(payload, options.includeEndpoint);
  return { ok: true as const, ...result, title: payload.title, body: payload.body };
}

export async function getVapidPublicKey() {
  if (!pushAlertsEnabled()) return "";
  return withLock(async () => {
    const db = await loadPushData();
    const vapid = ensureVapid(db);
    if (firestoreConfigured()) {
      await writeFirestoreVapid(vapid);
    }
    setMem(db);
    setGlobalDb(db);
    return vapid.publicKey;
  });
}

export async function savePushSubscription(sub: Omit<PushSubscriptionRecord, "createdAt">) {
  if (!pushAlertsEnabled()) return 0;
  return withLock(async () => {
    const db = await loadPushData();
    ensureVapid(db);
    const list = [...(db.pushSubscriptions ?? [])];
    const idx = list.findIndex((item) => item.endpoint === sub.endpoint);
    const existing = idx >= 0 ? list[idx] : undefined;
    const next: PushSubscriptionRecord = {
      endpoint: sub.endpoint,
      keys: { ...sub.keys },
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      ...(sub.topics !== undefined
        ? { topics: [...sub.topics] }
        : existing?.topics !== undefined
          ? { topics: [...existing.topics] }
          : {}),
    };
    const isNew = idx < 0;
    if (idx >= 0) list[idx] = next;
    else {
      if (list.length >= 8000) list.shift();
      list.push(next);
    }
    db.pushSubscriptions = list;
    setMem(db);
    setGlobalDb(db);
    setPushMemAt(Date.now());
    await writePushSubsBlob(list);
    if (firestoreConfigured()) {
      await writeFirestorePushSubscription(next, { isNew });
    }
    return list.length;
  });
}

export async function isPushEndpointRegistered(endpoint: string) {
  if ((getMem()?.pushSubscriptions ?? []).some((item) => item.endpoint === endpoint)) return true;
  if (firestoreConfigured()) {
    return (await readFirestorePushSubscription(endpoint)) !== null;
  }
  return false;
}

export async function countPushSubscriptions() {
  const mem = getMem();
  if (mem?.pushSubscriptions) return mem.pushSubscriptions.length;
  if (firestoreConfigured()) {
    const count = await countFirestorePushSubscriptions();
    if (count !== null) return count;
  }
  return (await loadPushData()).pushSubscriptions?.length ?? 0;
}

export async function sendPushTestToEndpoint(endpoint: string) {
  const db = await loadPushData();
  const sub = (db.pushSubscriptions ?? []).find((item) => item.endpoint === endpoint);
  if (!sub) {
    return {
      registered: false as const,
      total: db.pushSubscriptions?.length ?? 0,
    };
  }
  const vapid = ensureVapid(db);
  const payload = sanitizePushPayload({
    title: "בדיקת התראות",
    body: "אם אתם רואים את זה — ההתראות עובדות!",
    url: "/",
  });
  const { dead, delivered, errors } = await sendPushToSubscriptions({
    vapid,
    subscriptions: [sub],
    payload,
  });
  if (dead.length > 0) {
    await pruneDeadPushSubscriptions(dead);
  }
  return {
    registered: true as const,
    delivered: delivered > 0,
    errors,
    total: db.pushSubscriptions?.length ?? 0,
  };
}

async function pruneDeadPushSubscriptions(endpoints: string[]) {
  if (endpoints.length === 0) return;
  const deadSet = new Set(endpoints);
  await withLock(async () => {
    const mem = getMem();
    const list = (mem?.pushSubscriptions ?? []).filter((item) => !deadSet.has(item.endpoint));
    setMemPushSubscriptions(list);
    setPushMemAt(Date.now());
    if (firestoreConfigured()) {
      await Promise.all(endpoints.map((endpoint) => deleteFirestorePushSubscription(endpoint)));
    }
    await writePushSubsBlob(list);
    if (mem) setGlobalDb(mem);
  });
}

export async function removePushSubscription(endpoint: string) {
  return withLock(async () => {
    if (firestoreConfigured()) {
      await deleteFirestorePushSubscription(endpoint);
    }
    const mem = getMem();
    const list = (mem?.pushSubscriptions ?? []).filter((item) => item.endpoint !== endpoint);
    setMemPushSubscriptions(list);
    setPushMemAt(Date.now());
    if (mem) setGlobalDb(mem);
    await writePushSubsBlob(list);
    return list.length;
  });
}

export async function broadcastPush(
  payload: PushPayload,
  includeEndpoint?: string,
  options?: { allSubscriptions?: boolean },
) {
  if (!pushAlertsEnabled()) {
    return { sent: 0, failed: 0, attempted: 0, errors: 0 };
  }
  const db = await loadPushData();
  const vapid = ensureVapid(db);
  const subscriptions = (db.pushSubscriptions ?? []).filter(
    (item) =>
      options?.allSubscriptions ||
      subscriptionAllowsTopic(item, payload.topic) ||
      (includeEndpoint !== undefined && item.endpoint === includeEndpoint),
  );
  const { dead, delivered, errors } = await sendPushToSubscriptions({ vapid, subscriptions, payload });
  if (dead.length > 0) {
    await pruneDeadPushSubscriptions(dead);
  }
  return {
    sent: delivered,
    failed: dead.length + errors,
    attempted: subscriptions.length,
    errors,
  };
}
