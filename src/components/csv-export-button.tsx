"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { housesToXlsx, downloadSheet, sheetFilename } from "@/lib/house-csv";
import type { PublicHouse } from "@/lib/types";

export function CsvExportButton({
  houses,
  kind = "list",
  label,
}: {
  houses: PublicHouse[];
  kind?: "liked" | "list" | "all";
  label?: string;
}) {
  function onExport() {
    if (houses.length === 0) {
      toast.error("אין בתים לייצוא — המפה ריקה");
      return;
    }
    downloadSheet(sheetFilename(kind), housesToXlsx(houses));
    toast.success(`הורד קובץ עם ${houses.length} בתים`);
  }

  if (!label) {
    return (
      <button
        type="button"
        aria-label="הורדה"
        title="הורדה"
        onClick={onExport}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25"
      >
        <Download className="size-5" />
      </button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="border-orange-400/40 text-orange-100"
      onClick={onExport}
    >
      <Download className="size-4" />
      {label}
    </Button>
  );
}
