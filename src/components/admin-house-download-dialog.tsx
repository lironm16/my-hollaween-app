"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { FormPrimarySecondaryActions } from "@/components/form-primary-secondary-actions";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import { useLocale } from "@/hooks/use-locale";
import {
  downloadAdminHouseExport,
  type AdminHouseDownloadFormat,
} from "@/lib/admin-house-download";
import { cn } from "@/lib/utils";

export function AdminHouseDownloadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { dir, t } = useLocale();
  const [format, setFormat] = useState<AdminHouseDownloadFormat>("json");
  const [busy, setBusy] = useState(false);
  const groupId = useId();

  const formatOptions: ReadonlyArray<{
    id: AdminHouseDownloadFormat;
    label: string;
    hint: string;
  }> = [
    { id: "json", label: t("adminDownload.formatJson"), hint: t("adminDownload.formatJsonHint") },
    { id: "xlsx", label: t("adminDownload.formatXlsx"), hint: t("adminDownload.formatXlsxHint") },
    { id: "csv", label: t("adminDownload.formatCsv"), hint: t("adminDownload.formatCsvHint") },
  ];

  async function runDownload() {
    setBusy(true);
    try {
      await downloadAdminHouseExport(format);
      toast.success(t("adminDownload.success"));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("adminDownload.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={dir}
        showCloseButton={false}
        className="gap-0 overflow-hidden border border-orange-500/30 bg-[#1a0d24] p-0 text-orange-50 sm:max-w-md"
      >
        <OverlayCloseBar
          compact
          title={t("menu.adminDownload")}
          onClose={() => onOpenChange(false)}
          className="border-b border-orange-500/15 pb-2"
        />
        <div className="space-y-3 px-4 py-3">
          <p className="text-start text-sm leading-relaxed text-violet-200/90">{t("adminDownload.intro")}</p>
          <fieldset className="border-0 p-0">
            <legend className="mb-2 text-start text-sm font-semibold text-violet-200/90">
              {t("adminDownload.formatLegend")}
            </legend>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label={t("adminDownload.formatAria")}>
              {formatOptions.map((option) => {
                const checked = format === option.id;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer touch-manipulation flex-col gap-0.5 rounded-xl border px-3 py-2 text-start transition-colors",
                      checked
                        ? "border-orange-400/55 bg-orange-500/10 ring-1 ring-orange-400/35"
                        : "border-violet-500/25 bg-[#12081a]/80 hover:border-violet-400/35",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={groupId}
                        value={option.id}
                        checked={checked}
                        onChange={() => setFormat(option.id)}
                        className="size-4 shrink-0 accent-orange-500"
                      />
                      <span className="text-base font-medium text-orange-50">{option.label}</span>
                    </span>
                    <span className="ps-6 text-sm text-violet-300/85">{option.hint}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
        <div className="border-t border-orange-500/15 bg-[#14091c]/80 px-4 py-3">
          <FormPrimarySecondaryActions
            primaryLabel={busy ? t("adminDownload.downloading") : t("adminDownload.download")}
            secondaryLabel={t("common.cancel")}
            onPrimary={() => void runDownload()}
            onSecondary={() => onOpenChange(false)}
            primaryDisabled={busy}
            secondaryDisabled={busy}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
