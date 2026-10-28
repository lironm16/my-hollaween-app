import { defaultAppLocale, readStoredAppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function datedFilename(prefix: string, ext: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `${prefix}-${day}.${ext}`;
}

export type AdminHouseDownloadFormat = "json" | "xlsx" | "csv";

export async function downloadAdminHouseExport(format: AdminHouseDownloadFormat): Promise<void> {
  const locale = readStoredAppLocale() ?? defaultAppLocale();
  const adminRequired = translate(locale, "adminSettings.download.adminRequired");
  const backupFailed = translate(locale, "adminSettings.download.backupFailed");
  const fileFailed = translate(locale, "adminSettings.download.fileFailed");

  if (format === "json") {
    const res = await fetch("/api/admin/houses", { credentials: "include", cache: "no-store" });
    if (!res.ok) {
      throw new Error(res.status === 401 ? adminRequired : backupFailed);
    }
    const payload = await res.json();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    triggerDownload(datedFilename("hallowhood-houses-backup", "json"), blob);
    return;
  }
  const query = format === "csv" ? "csv" : "xlsx";
  const res = await fetch(`/api/admin/export?format=${query}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? adminRequired : fileFailed);
  }
  const blob = await res.blob();
  const ext = format === "csv" ? "csv" : "xlsx";
  triggerDownload(datedFilename("hallowhood-houses", ext), blob);
}
