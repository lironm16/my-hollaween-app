import { NextResponse } from "next/server";
import {
  helpRequestEmailConfigured,
  helpRequestNotifyEmails,
} from "@/lib/help-request-email";
import { helpRequestDeliveryConfigured } from "@/lib/help-request-store";

export const runtime = "nodejs";

/** Quick prod check — no secrets returned. */
export async function GET() {
  const emails = helpRequestNotifyEmails();
  const masked =
    emails.length === 0
      ? null
      : emails.map((e) => {
          const at = e.indexOf("@");
          if (at <= 1) return "***";
          return `${e.slice(0, 2)}***${e.slice(at)}`;
        });
  return NextResponse.json({
    deliveryConfigured: helpRequestDeliveryConfigured(),
    emailConfigured: helpRequestEmailConfigured(),
    hasResendKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    hasSmtp: Boolean(
      process.env.HELP_REQUEST_SMTP_USER?.trim() && process.env.HELP_REQUEST_SMTP_PASS?.trim(),
    ),
    notifyInboxes: masked,
    notifyCount: emails.length,
  });
}
