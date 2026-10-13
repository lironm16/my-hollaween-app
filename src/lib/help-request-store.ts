import { randomUUID } from "node:crypto";
import type { HelpRequestSubmitInput, StoredHelpRequest } from "@/lib/help-request-schema";
import { formatHelpRequestPlain } from "@/lib/help-request-format";
import { helpRequestEmailConfigured, notifyHelpRequestEmail } from "@/lib/help-request-email";

export { formatHelpRequestPlain, helpRequestPublicId } from "@/lib/help-request-format";

export function helpRequestDeliveryConfigured(): boolean {
  if (helpRequestEmailConfigured()) return true;
  if (process.env.HELP_REQUEST_WEBHOOK_URL?.trim()) return true;
  return false;
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

function toStoredRecord(input: HelpRequestSubmitInput): StoredHelpRequest {
  const { company: _honeypot, phone, ...rest } = input;
  return {
    ...rest,
    phone: phone ?? "",
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
}

export async function persistHelpRequest(input: HelpRequestSubmitInput): Promise<StoredHelpRequest> {
  const record = toStoredRecord(input);

  const emailWanted = helpRequestEmailConfigured();
  const webhookWanted = Boolean(process.env.HELP_REQUEST_WEBHOOK_URL?.trim());

  const [webhookOk, emailOk] = await Promise.all([
    webhookWanted ? notifyHelpRequestWebhook(record) : Promise.resolve(false),
    emailWanted ? notifyHelpRequestEmail(record) : Promise.resolve(false),
  ]);

  if (emailWanted && !emailOk) {
    throw new Error("HELP_REQUEST_EMAIL_FAILED");
  }
  if (!emailWanted && webhookWanted && !webhookOk) {
    throw new Error("HELP_REQUEST_WEBHOOK_FAILED");
  }
  if (!emailWanted && !webhookWanted) {
    throw new Error("HELP_REQUEST_NOT_CONFIGURED");
  }

  return record;
}
