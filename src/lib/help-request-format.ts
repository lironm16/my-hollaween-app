import { createHash } from "node:crypto";
import {
  HELP_REQUEST_PLATFORM_LABELS,
  HELP_REQUEST_ROLE_LABELS,
  HELP_REQUEST_TOPIC_LABELS,
  type StoredHelpRequest,
} from "@/lib/help-request-schema";

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

/** Short id for support threads without exposing full UUID in notifications. */
export function helpRequestPublicId(id: string): string {
  return createHash("sha256").update(id).digest("hex").slice(0, 8);
}
