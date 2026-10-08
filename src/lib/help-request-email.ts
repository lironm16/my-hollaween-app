import nodemailer from "nodemailer";
import { formatHelpRequestPlain, helpRequestPublicId } from "@/lib/help-request-format";
import type { StoredHelpRequest } from "@/lib/help-request-schema";

/** Comma- or semicolon-separated inbox list. */
export function helpRequestNotifyEmails(): string[] {
  const raw = process.env.HELP_REQUEST_NOTIFY_EMAIL?.trim();
  if (!raw) return [];
  return [...new Set(raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean))];
}

export function helpRequestSmtpConfigured(): boolean {
  const user = process.env.HELP_REQUEST_SMTP_USER?.trim();
  const pass = process.env.HELP_REQUEST_SMTP_PASS?.trim();
  return Boolean(user && pass);
}

/** Needs inbox + Resend API key or Gmail/SMTP credentials (FormSubmit is blocked from Vercel). */
export function helpRequestEmailConfigured(): boolean {
  const emails = helpRequestNotifyEmails();
  if (!emails.length) return false;
  if (process.env.RESEND_API_KEY?.trim()) return true;
  if (helpRequestSmtpConfigured()) return true;
  return false;
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

async function sendViaSmtp(record: StoredHelpRequest, to: string[]): Promise<boolean> {
  if (!helpRequestSmtpConfigured()) return false;
  const user = process.env.HELP_REQUEST_SMTP_USER!.trim();
  const pass = process.env.HELP_REQUEST_SMTP_PASS!.trim();
  const host = process.env.HELP_REQUEST_SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.HELP_REQUEST_SMTP_PORT?.trim() || "465");
  const text = formatHelpRequestPlain(record);

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transport.sendMail({
      from: process.env.HELP_REQUEST_EMAIL_FROM?.trim() || `"בשכונה Halloween" <${user}>`,
      to: to.join(", "),
      subject: helpRequestEmailSubject(record),
      text,
    });
    return true;
  } catch (error) {
    console.error("[help-request] smtp failed", error);
    return false;
  }
}

export async function notifyHelpRequestEmail(record: StoredHelpRequest): Promise<boolean> {
  const to = helpRequestNotifyEmails();
  if (!to.length) return false;

  if (process.env.RESEND_API_KEY?.trim()) {
    const ok = await sendViaResend(record, to);
    if (ok) return true;
  }
  return sendViaSmtp(record, to);
}
