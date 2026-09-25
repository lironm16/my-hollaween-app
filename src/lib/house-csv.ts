import { formatDisplayAddress } from "@/lib/config";
import { formatHoursLabel } from "@/lib/hours";
import { candyLevel, offersSensitivity, resolveDecorLevel } from "@/lib/house-state";
import { formatHouseAddedAt } from "@/lib/house-meta";
import { decorShort, scareShort, houseHeadline } from "@/lib/labels";
import type { WalkingRoute } from "@/lib/route";
import type { PublicHouse } from "@/lib/types";

const PUBLIC_HEADERS = [
  "מס'",
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
  "טבעוני",
  "נוסף על ידי",
  "תאריך הוספה",
] as const;

function csvCell(value: string | number) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function xmlText(value: string | number) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
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

/** Same scale as the form: לא מקושט → לילדים → קצת מפחיד → מפחיד. */
function scareDecorLabel(house: PublicHouse) {
  if (resolveDecorLevel(house) === "none") return decorShort.none;
  return scareShort[house.scareLevel];
}

function houseRow(house: PublicHouse, index: number): Array<string | number> {
  return [
    index + 1,
    house.name,
    formatDisplayAddress(house),
    house.arrival || "",
    house.description || "",
    house.notes || "",
    formatHoursLabel(house),
    candyLabel(house),
    scareDecorLabel(house),
    house.accessible ? "כן" : "לא",
    offersSensitivity(house, "glutenFree") ? "כן" : "לא",
    offersSensitivity(house, "nutsFree") ? "כן" : "לא",
    offersSensitivity(house, "sesameFree") ? "כן" : "לא",
    offersSensitivity(house, "vegan") ? "כן" : "לא",
    house.addedBy?.trim() || "",
    house.createdAt ? formatHouseAddedAt(house.createdAt) : "",
  ];
}

export function housesToCsv(houses: PublicHouse[]) {
  const lines = [[...PUBLIC_HEADERS].join(",")];
  houses.forEach((house, index) => {
    lines.push(houseRow(house, index).map(csvCell).join(","));
  });
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]!;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function zipStore(files: { name: string; data: Uint8Array }[]) {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      name,
      file.data,
    ]);
    locals.push(local);
    centrals.push(
      concatBytes([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(file.data.length),
        u32(file.data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ]),
    );
    offset += local.length;
  }
  const central = concatBytes(centrals);
  const end = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);
  return concatBytes([...locals, central, end]);
}

function colLetter(index: number) {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

function xlsxCell(value: string | number, ref: string, header = false) {
  const style = header ? ' s="1"' : ' s="0"';
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"${style} t="n"><v>${value}</v></c>`;
  }
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`;
}

/** Real Office Open XML workbook — Excel opens this without a corrupt-file warning. */
export function housesToXlsx(houses: PublicHouse[]): Uint8Array {
  const headers = [...PUBLIC_HEADERS];
  const rows = [
    headers as Array<string | number>,
    ...houses.map((house, index) => houseRow(house, index)),
  ];
  const lastCol = colLetter(headers.length - 1);
  const sheetRows = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 1;
      const cells = row.map((value, colIndex) => xlsxCell(value, `${colLetter(colIndex)}${r}`, rowIndex === 0)).join("");
      return `<row r="${r}" ht="28" customHeight="1">${cells}</row>`;
    })
    .join("");
  const colWidths = [8, 22, 28, 26, 36, 24, 16, 14, 16, 10, 14, 14, 14, 10, 10];
  const cols = headers
    .map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="${colWidths[index] ?? 14}" customWidth="1"/>`)
    .join("");
  const encoder = new TextEncoder();
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="בתים" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" horizontal="right" vertical="top"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1" horizontal="right" vertical="top"/></xf>
  </cellXfs>
</styleSheet>`;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCol}${rows.length}"/>
  <sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${cols}</cols>
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
  return zipStore([
    { name: "[Content_Types].xml", data: encoder.encode(contentTypes) },
    { name: "_rels/.rels", data: encoder.encode(rels) },
    { name: "xl/workbook.xml", data: encoder.encode(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode(workbookRels) },
    { name: "xl/styles.xml", data: encoder.encode(styles) },
    { name: "xl/worksheets/sheet1.xml", data: encoder.encode(sheet) },
  ]);
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(filename, blob);
}

export function downloadSheet(filename: string, xlsx: Uint8Array) {
  const copy = new Uint8Array(xlsx);
  const blob = new Blob([copy], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

export type HouseExportFormat = "xlsx" | "csv" | "txt";

/** UI export formats (CSV kept for admin API only). */
export const HOUSE_EXPORT_FORMAT_OPTIONS: ReadonlyArray<{
  id: Extract<HouseExportFormat, "xlsx" | "txt">;
  labelHe: string;
}> = [
  { id: "xlsx", labelHe: "טבלה" },
  { id: "txt", labelHe: "טקסט" },
];

const RTL_MARK = "\u200F";

export function plainTextExportRtl(lines: string[]) {
  return `\uFEFF${lines.map((line) => (line.trim() ? `${RTL_MARK}${line}` : line)).join("\n")}\n`;
}

export function exportHouseCountMessage(
  exportCount: number,
  totalInSet: number,
  activeFilterCount: number,
) {
  if (exportCount === 0) {
    return "אין בתים לשמירה לפי הסינון הנוכחי.";
  }
  if (exportCount === totalInSet && activeFilterCount === 0) {
    return `יישמרו כל ${exportCount} הבתים שמוצגים כרגע במפה/ברשימה.`;
  }
  return `יישמרו ${exportCount} בתים מתוך ${totalInSet} — לפי הסינון והמסננים הפעילים.`;
}

export function csvFilename(kind: "liked" | "list" | "all") {
  const day = new Date().toISOString().slice(0, 10);
  if (kind === "liked") return `hallowhood-saved-${day}.csv`;
  if (kind === "all") return `hallowhood-houses-${day}.csv`;
  return `hallowhood-list-${day}.csv`;
}

export function exportFilename(kind: "liked" | "list" | "all", format: HouseExportFormat) {
  const stem = csvFilename(kind).replace(/\.csv$/, "");
  return `${stem}.${format === "xlsx" ? "xlsx" : format}`;
}

export function sheetFilename(kind: "liked" | "list" | "all") {
  return exportFilename(kind, "xlsx");
}

export function housesToExportTxt(houses: PublicHouse[]) {
  const lines = ["רשימת בתים — HallowHood", ""];
  houses.forEach((house, index) => {
    lines.push(`${index + 1}. ${houseHeadline(house)}`);
    lines.push(`   ${formatDisplayAddress(house)}`);
    if (house.arrival?.trim()) lines.push(`   ${house.arrival.trim()}`);
    lines.push("");
  });
  return plainTextExportRtl(lines);
}

export function routeToExportTxt(route: WalkingRoute) {
  const lines = [
    "מסלול HallowHood — סדר העצירות קבוע (לא תלוי במיקום)",
    route.originLabel ? `התחלה: ${route.originLabel}` : "",
    "",
  ].filter(Boolean);
  for (const stop of route.stops) {
    lines.push(`${stop.order}. ${houseHeadline(stop.house)}`);
    lines.push(`   ${formatDisplayAddress(stop.house)}`);
    if (stop.houses.length > 1) {
      lines.push(`   (${stop.houses.length} דירות בכתובת)`);
    }
    lines.push("");
  }
  return plainTextExportRtl(lines);
}

export function downloadTxt(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  triggerDownload(filename, blob);
}

/** Mobile share sheet — save to Notes (iOS) or any app (Android). */
export async function sharePlainTextFile(filename: string, text: string, title: string) {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    const file = new File([text], filename, { type: "text/plain;charset=utf-8" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title, text: title });
      return true;
    }
    await navigator.share({ title, text: text.slice(0, 8000) });
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return true;
    return false;
  }
}

export function downloadHouseExport(
  houses: PublicHouse[],
  kind: "liked" | "list" | "all",
  format: HouseExportFormat,
) {
  const filename = exportFilename(kind, format);
  if (format === "xlsx") {
    downloadSheet(filename, housesToXlsx(houses));
    return;
  }
  if (format === "csv") {
    downloadCsv(filename, housesToCsv(houses));
    return;
  }
  downloadTxt(filename, housesToExportTxt(houses));
}

export async function downloadOrShareHouseExport(
  houses: PublicHouse[],
  kind: "liked" | "list" | "all",
  format: HouseExportFormat,
  options?: { preferShare?: boolean },
) {
  if (format !== "txt" || !options?.preferShare) {
    downloadHouseExport(houses, kind, format);
    return;
  }
  const text = housesToExportTxt(houses);
  const filename = exportFilename(kind, "txt");
  const shared = await sharePlainTextFile(filename, text, "רשימת בתים");
  if (!shared) downloadTxt(filename, text);
}

export async function downloadOrShareRouteTxt(route: WalkingRoute, preferShare: boolean) {
  const text = routeToExportTxt(route);
  const day = new Date().toISOString().slice(0, 10);
  const filename = `hallowhood-route-${day}.txt`;
  if (preferShare) {
    const shared = await sharePlainTextFile(filename, text, "מסלול HallowHood");
    if (shared) return;
  }
  downloadTxt(filename, text);
}
