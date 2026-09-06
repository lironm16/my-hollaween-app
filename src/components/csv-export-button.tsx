"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { csvFilename, downloadCsv, housesToCsv } from "@/lib/house-csv";
import type { HouseTraffic } from "@/lib/traffic";
import type { PublicHouse } from "@/lib/types";

export function CsvExportButton({
  houses,
  traffic,
  kind = "list",
  label,
}: {
  houses: PublicHouse[];
  traffic?: Record<string, HouseTraffic>;
  kind?: "liked" | "list" | "all";
  label?: string;
}) {
  function onExport() {
    if (houses.length === 0) {
      toast.error("אין בתים לייצוא. סננו או שמרו בתים בלב קודם.");
      return;
    }
    downloadCsv(csvFilename(kind), housesToCsv(houses, traffic));
    toast.success(`הורד קובץ עם ${houses.length} בתים`);
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
      {label ?? "הורדה להדפסה"}
    </Button>
  );
}
