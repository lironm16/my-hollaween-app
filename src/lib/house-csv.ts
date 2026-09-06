import { formatDisplayAddress } from "@/lib/config";
import { formatHoursLabel } from "@/lib/hours";
import {
  candyLevel,
  effectiveVisit,
  offersSensitivity,
  resolveDecorLevel,
} from "@/lib/house-state";
import { decorShort, scareShort, visitShort } from "@/lib/labels";
import type { HouseTraffic } from "@/lib/traffic";
import type { PublicHouse } from "@/lib/types";

const HEADERS = [
  "שם",
  "כתובת",
  "דירה / איך מגיעים",
  "שעות",
  "מצב ביקור",
  "ממתקים",
  "פחד",
  "קישוט",
  "עגלות",
  "ללא גלוטן",
  "ללא אגוזים",
  "ללא שומשום",
  "הערות",
  "שמרו",
  "ביקרו",
] as const;

function csvCell(value: string | number) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function candyLabel(house: PublicHouse) {
  if (!house.treats.includes("candy")) return "בלי ממתקים";
  const level = candyLevel(house);
  if (level === "plenty") return "יש";
  if (level === "low") return "מעט";
  return "נגמר";
}

export function housesToCsv(
  houses: PublicHouse[],
  traffic: Record<string, HouseTraffic> = {},
) {
  const lines = [HEADERS.join(",")];
  for (const house of houses) {
    const stats = traffic[house.id];
    lines.push(
      [
        house.name,
        formatDisplayAddress(house),
        house.arrival || "",
        formatHoursLabel(house),
        visitShort[effectiveVisit(house)],
        candyLabel(house),
        scareShort[house.scareLevel],
        decorShort[resolveDecorLevel(house)],
        house.accessible ? "כן" : "לא",
        offersSensitivity(house, "glutenFree") ? "כן" : "לא",
        offersSensitivity(house, "nutsFree") ? "כן" : "לא",
        offersSensitivity(house, "sesameFree") ? "כן" : "לא",
        house.notes || "",
        stats?.saved ?? 0,
        stats?.visited ?? 0,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csvFilename(kind: "liked" | "list" | "all") {
  const day = new Date().toISOString().slice(0, 10);
  if (kind === "liked") return `spookyhouzz-saved-${day}.csv`;
  if (kind === "all") return `spookyhouzz-houses-${day}.csv`;
  return `spookyhouzz-list-${day}.csv`;
}
