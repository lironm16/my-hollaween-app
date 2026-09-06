import { formatDisplayAddress } from "@/lib/config";
import { formatHoursLabel } from "@/lib/hours";
import { candyLevel, offersSensitivity } from "@/lib/house-state";
import { scareShort } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

const HEADERS = [
  "שם",
  "כתובת",
  "דירה / איך מגיעים",
  "מה מחכה בבית",
  "הערות",
  "שעות",
  "ממתקים",
  "פחד",
  "נגיש",
  "ללא גלוטן",
  "ללא אגוזים",
  "ללא שומשום",
] as const;

function csvCell(value: string | number) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function htmlCell(value: string | number) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function candyLabel(house: PublicHouse) {
  if (!house.treats.includes("candy")) return "בלי ממתקים";
  const level = candyLevel(house);
  if (level === "plenty") return "יש";
  if (level === "low") return "מעט";
  return "נגמר";
}

function houseRow(house: PublicHouse): string[] {
  return [
    house.name,
    formatDisplayAddress(house),
    house.arrival || "",
    house.description || "",
    house.notes || "",
    formatHoursLabel(house),
    candyLabel(house),
    scareShort[house.scareLevel],
    house.accessible ? "כן" : "לא",
    offersSensitivity(house, "glutenFree") ? "כן" : "לא",
    offersSensitivity(house, "nutsFree") ? "כן" : "לא",
    offersSensitivity(house, "sesameFree") ? "כן" : "לא",
  ];
}

export function housesToCsv(houses: PublicHouse[]) {
  const lines = [HEADERS.join(",")];
  for (const house of houses) {
    lines.push(houseRow(house).map(csvCell).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function housesToSheetHtml(houses: PublicHouse[]) {
  const head = HEADERS.map((header) => `<th>${htmlCell(header)}</th>`).join("");
  const body = houses
    .map((house) => {
      const cells = houseRow(house)
        .map((value) => `<td>${htmlCell(value)}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>SpookyHouzz</title>
<style>
  body { font-family: Arial, sans-serif; }
  table { border-collapse: collapse; direction: rtl; }
  th, td { border: 1px solid #bbb; padding: 8px; text-align: right; vertical-align: top; white-space: pre-wrap; }
  th { background: #f3e8ff; }
</style>
</head>
<body>
<table>
<thead><tr>${head}</tr></thead>
<tbody>${body}</tbody>
</table>
</body>
</html>`;
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

export function downloadSheet(filename: string, html: string) {
  const blob = new Blob([`\uFEFF${html}`], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
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

export function sheetFilename(kind: "liked" | "list" | "all") {
  return csvFilename(kind).replace(/\.csv$/, ".xls");
}
