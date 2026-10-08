import { formatHelpRequestPlain, helpRequestPublicId } from "@/lib/help-request-format";
import type { StoredHelpRequest } from "@/lib/help-request-schema";

/** Comma- or semicolon-separated inbox list. */
export function helpRequestNotifyEmails(): string[] {
  const raw = process.env.HELP_REQUEST_NOTIFY_EMAIL?.trim();
  if (!raw) return [];
  return [...new Set(raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean))];
}

export function helpRequestEmailConfigured(): boolean {
  const emails = helpRequestNotifyEmails();
  if (!emails.length) return false;
  if (process.env.RESEND_API_KEY?.trim()) return true;
  if (process.env.HELP_REQUEST_USE_FORMSUBMIT === "0") return false;
  return true;
}

function helpRequestEmailSubject(record: StoredHelpRequest): string {
  const ticket = helpRequestPublicId(record.id);
  const phone = record.phone?.trim();
  const bits = [`עזרה Halloween`, record.name.trim()];
  if (phone) bits.push(phone);
  bits.push(`#${ticket}`);
  return bits.join(" · ").slice(0, 200);
}

async function sendViaResend(record: StoredHelpRequest, to: string[]): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const from =
    process.env.HELP_REQUEST_EMAIL_FROM?.trim() || "בשכונה Halloween <onboarding@resend.dev>";
  const text = formatHelpRequestPlain(record);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: helpRequestEmailSubject(record),
      text,
    }),
  });

  if (!res.ok) {
    console.error("[help-request] resend failed", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

/** First-time setup: FormSubmit sends a confirmation link to the inbox — click once. */
async function sendViaFormSubmit(record: StoredHelpRequest, to: string[]): Promise<boolean> {
  if (to.length !== 1) {
    console.error("[help-request] formsubmit supports one HELP_REQUEST_NOTIFY_EMAIL only");
    return false;
  }
  const inbox = to[0]!;
  const text = formatHelpRequestPlain(record);
  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(inbox)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      _subject: helpRequestEmailSubject(record),
      _captcha: "false",
      _template: "box",
      name: record.name,
      role: record.role,
      platform: record.platform,
      phone: record.phone || "(לא הושאר)",
      message: text,
    }),
  });
  if (!res.ok) {
    console.error("[help-request] formsubmit failed", res.status, await res.text().catch(() => ""));
    return false;
  }
  let ok = true;
  try {
    const data = (await res.json()) as { success?: string };
    ok = data.success === "true" || data.success === true;
  } catch {
    ok = true;
  }
  if (!ok) console.error("[help-request] formsubmit rejected payload");
  return ok;
}

export async function notifyHelpRequestEmail(record: StoredHelpRequest): Promise<boolean> {
  const to = helpRequestNotifyEmails();
  if (!to.length) return false;

  if (process.env.RESEND_API_KEY?.trim()) {
    return sendViaResend(record, to);
  }
  if (process.env.HELP_REQUEST_USE_FORMSUBMIT === "0") return false;
  return sendViaFormSubmit(record, to);
}
