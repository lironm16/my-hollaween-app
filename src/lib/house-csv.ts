import { formatDisplayAddress } from "@/lib/config";
import { formatHoursLabel } from "@/lib/hours";
import { candyLevel, offersSensitivity } from "@/lib/house-state";
import { scareShort } from "@/lib/labels";
import type { HouseTraffic } from "@/lib/traffic";
import type { PublicHouse } from "@/lib/types";

const PUBLIC_HEADERS = [
  "שם",
  "כתובת",
  "איך מגיעים / דירה",
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

const TRAFFIC_HEADERS = ["שמרו", "ביקרו"] as const;

export type SheetOptions = {
  /** Neighborhood saved/visited counts — included for managers using the same download. */
  traffic?: Record<string, HouseTraffic>;
};

function csvCell(value: string | number) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function xmlText(value: string | number) {
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

function houseRow(house: PublicHouse, traffic?: HouseTraffic): Array<string | number> {
  const cells: Array<string | number> = [
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
  if (traffic) {
    cells.push(traffic.saved ?? 0, traffic.visited ?? 0);
  }
  return cells;
}

function headersFor(options?: SheetOptions) {
  return options?.traffic ? [...PUBLIC_HEADERS, ...TRAFFIC_HEADERS] : [...PUBLIC_HEADERS];
}

export function housesToCsv(houses: PublicHouse[], options?: SheetOptions) {
  const lines = [headersFor(options).join(",")];
  for (const house of houses) {
    lines.push(houseRow(house, options?.traffic?.[house.id]).map(csvCell).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function xmlCell(value: string | number, header = false) {
  const style = header ? ' ss:StyleID="header"' : "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell${style}><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell${style}><Data ss:Type="String">${xmlText(value)}</Data></Cell>`;
}

/** SpreadsheetML 2003 — real Excel XML, not HTML pretending to be .xls. */
export function housesToExcelXml(houses: PublicHouse[], options?: SheetOptions) {
  const headers = headersFor(options);
  const head = `<Row>${headers.map((header) => xmlCell(header, true)).join("")}</Row>`;
  const body = houses
    .map((house) => {
      const cells = houseRow(house, options?.traffic?.[house.id])
        .map((value) => xmlCell(value))
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#F3E8FF" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Top" ss:WrapText="1"/>
  </Style>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Horizontal="Right" ss:Vertical="Top" ss:WrapText="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="בתים" ss:RightToLeft="1">
  <Table>${head}${body}</Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <DisplayRightToLeft/>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(filename, blob);
}

export function downloadSheet(filename: string, xml: string) {
  const blob = new Blob([xml], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  triggerDownload(filename, blob);
}

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

export function csvFilename(kind: "liked" | "list" | "all") {
  const day = new Date().toISOString().slice(0, 10);
  if (kind === "liked") return `spookyhouzz-saved-${day}.csv`;
  if (kind === "all") return `spookyhouzz-houses-${day}.csv`;
  return `spookyhouzz-list-${day}.csv`;
}

export function sheetFilename(kind: "liked" | "list" | "all") {
  return csvFilename(kind).replace(/\.csv$/, ".xls");
}
