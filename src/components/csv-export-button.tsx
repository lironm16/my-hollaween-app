"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useHouseTraffic } from "@/hooks/use-house-traffic";
import { housesToXlsx, downloadSheet, sheetFilename } from "@/lib/house-csv";
import { EMPTY_TRAFFIC, type HouseTraffic } from "@/lib/traffic";
import type { PublicHouse } from "@/lib/types";

export function CsvExportButton({
  houses,
  kind = "list",
  label,
  includeTraffic = false,
}: {
  houses: PublicHouse[];
  kind?: "liked" | "list" | "all";
  label?: string;
  /** Managers get saved/visited columns on the same download. */
  includeTraffic?: boolean;
}) {
  const { trafficFor } = useHouseTraffic();

  function onExport() {
    if (houses.length === 0) {
      toast.error("אין בתים לייצוא. סננו או שמרו בתים בלב קודם.");
      return;
    }
    let traffic: Record<string, HouseTraffic> | undefined;
    if (includeTraffic) {
      traffic = {};
      for (const house of houses) {
        traffic[house.id] = trafficFor(house.id) ?? EMPTY_TRAFFIC;
      }
    }
    downloadSheet(sheetFilename(kind), housesToXlsx(houses, traffic ? { traffic } : undefined));
    toast.success(`הורד קובץ עם ${houses.length} בתים`);
  }

  if (!label) {
    return (
      <button
        type="button"
        aria-label="הורדה"
        title="הורדה"
        onClick={onExport}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25"
      >
        <Download className="size-4" />
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
