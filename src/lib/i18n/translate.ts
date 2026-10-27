import type { AppLocale } from "@/lib/i18n/locale";
import { enMessages } from "@/lib/i18n/messages/en";
import type { AppMessages } from "@/lib/i18n/messages/he";
import { heMessages } from "@/lib/i18n/messages/he";

const catalogs: Record<AppLocale, AppMessages> = {
  en: enMessages,
  he: heMessages,
};

export function messagesForLocale(locale: AppLocale): AppMessages {
  return catalogs[locale];
}

/** Dot-path lookup with a fixed message tree shape. */
export function translate(locale: AppLocale, path: string): string {
  const parts = path.split(".");
  let node: unknown = catalogs[locale];
  for (const part of parts) {
    if (node == null || typeof node !== "object") return path;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : path;
}
