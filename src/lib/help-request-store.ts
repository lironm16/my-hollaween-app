import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { HelpRequestSubmitInput, StoredHelpRequest } from "@/lib/help-request-schema";
import { formatHelpRequestPlain } from "@/lib/help-request-format";
import { helpRequestEmailConfigured, notifyHelpRequestEmail } from "@/lib/help-request-email";
import { firestoreConfigured, neighborhoodRoot, resolveAdminFirestore } from "@/lib/firestore-admin";

export { formatHelpRequestPlain, helpRequestPublicId } from "@/lib/help-request-format";

export function helpRequestDeliveryConfigured(): boolean {
  if (process.env.HELP_REQUEST_WEBHOOK_URL?.trim()) return true;
  if (helpRequestEmailConfigured()) return true;
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
    notifyHelpRequestEmail(record),
  ]);

  if (!results.some(Boolean)) {
    throw new Error("HELP_REQUEST_NOT_CONFIGURED");
  }

  return record;
}
