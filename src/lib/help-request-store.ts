import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  HELP_REQUEST_PLATFORM_LABELS,
  HELP_REQUEST_ROLE_LABELS,
  HELP_REQUEST_TOPIC_LABELS,
  type HelpRequestSubmitInput,
  type StoredHelpRequest,
} from "@/lib/help-request-schema";
import { firestoreConfigured, neighborhoodRoot, resolveAdminFirestore } from "@/lib/firestore-admin";

export function helpRequestDeliveryConfigured(): boolean {
  if (process.env.HELP_REQUEST_WEBHOOK_URL?.trim()) return true;
  if (firestoreConfigured()) return true;
  if (process.env.DATA_DIR?.trim()) return true;
  return false;
}

function helpRequestsFilePath() {
  const dir = process.env.DATA_DIR?.trim();
  if (!dir) return null;
  return path.join(dir, "help-requests.json");
}

async function appendHelpRequestFile(record: StoredHelpRequest): Promise<boolean> {
  const file = helpRequestsFilePath();
  if (!file) return false;
  await fs.mkdir(path.dirname(file), { recursive: true });
  let list: StoredHelpRequest[] = [];
  try {
    const raw = await fs.readFile(file, "utf8");
    list = JSON.parse(raw) as StoredHelpRequest[];
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }
  list.push(record);
  await fs.writeFile(file, JSON.stringify(list, null, 2), "utf8");
  return true;
}

async function writeHelpRequestFirestore(record: StoredHelpRequest): Promise<boolean> {
  if (!firestoreConfigured()) return false;
  await resolveAdminFirestore();
  await neighborhoodRoot().collection("helpRequests").doc(record.id).set(record);
  return true;
}

function webhookHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function formatHelpRequestPlain(record: StoredHelpRequest): string {
  const lines = [
    `🆘 עזרה — ${record.name}`,
    `תפקיד: ${HELP_REQUEST_ROLE_LABELS[record.role]}`,
    `מכשיר: ${HELP_REQUEST_PLATFORM_LABELS[record.platform]}`,
  ];
  if (record.topic) lines.push(`נושא: ${HELP_REQUEST_TOPIC_LABELS[record.topic]}`);
  if (record.phone) lines.push(`טלפון: ${record.phone}`);
  if (record.houseHint?.trim()) lines.push(`בית/כתובת: ${record.houseHint.trim()}`);
  lines.push("", record.message.trim());
  const ctx = record.context;
  if (ctx && typeof ctx === "object") {
    lines.push("");
    lines.push("— הקשר טכני —");
    const c = ctx as Record<string, unknown>;
    if (c.appVersion) lines.push(`גרסה: ${c.appVersion}`);
    if (c.path) lines.push(`עמוד: ${c.path}`);
    if (c.neighborhoodLabel) lines.push(`שכונה: ${c.neighborhoodLabel}`);
    if (typeof c.online === "boolean") lines.push(`רשת: ${c.online ? "מקוון" : "לא מקוון"}`);
    if (typeof c.standalone === "boolean") lines.push(`PWA: ${c.standalone ? "כן" : "לא"}`);
    if (c.detectedPlatform) lines.push(`זיהוי UA: ${c.detectedPlatform}`);
    if (c.viewport) lines.push(`מסך: ${c.viewport}`);
    if (c.userAgent) lines.push(`UA: ${String(c.userAgent).slice(0, 200)}`);
  }
  lines.push("", `id: ${record.id}`, record.createdAt);
  return lines.join("\n");
}

async function notifyHelpRequestWebhook(record: StoredHelpRequest): Promise<boolean> {
  const url = process.env.HELP_REQUEST_WEBHOOK_URL?.trim();
  if (!url) return false;
  const text = formatHelpRequestPlain(record);
  const host = webhookHost(url);
  let body: Record<string, unknown>;
  if (host.includes("discord.com") || host.includes("discordapp.com")) {
    body = { content: text.slice(0, 1900) };
  } else if (host.includes("slack.com")) {
    body = { text };
  } else {
    body = { text, record };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error("[help-request] webhook failed", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

export async function persistHelpRequest(input: HelpRequestSubmitInput): Promise<StoredHelpRequest> {
  const record: StoredHelpRequest = {
    ...input,
    phone: input.phone ?? "",
    company: undefined,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const results = await Promise.all([
    writeHelpRequestFirestore(record),
    appendHelpRequestFile(record),
    notifyHelpRequestWebhook(record),
  ]);

  if (!results.some(Boolean)) {
    throw new Error("HELP_REQUEST_NOT_CONFIGURED");
  }

  return record;
}

/** Short id for support threads without exposing full UUID in notifications. */
export function helpRequestPublicId(id: string): string {
  return createHash("sha256").update(id).digest("hex").slice(0, 8);
}
