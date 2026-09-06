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
export function housesToXlsx(houses: PublicHouse[], options?: SheetOptions): Uint8Array {
  const headers = headersFor(options);
  const rows = [headers as Array<string | number>, ...houses.map((house) => houseRow(house, options?.traffic?.[house.id]))];
  const lastCol = colLetter(headers.length - 1);
  const sheetRows = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 1;
      const cells = row.map((value, colIndex) => xlsxCell(value, `${colLetter(colIndex)}${r}`, rowIndex === 0)).join("");
      return `<row r="${r}" ht="28" customHeight="1">${cells}</row>`;
    })
    .join("");
  const colWidths = [22, 28, 26, 36, 24, 16, 14, 16, 10, 14, 14, 14, 10, 10];
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

export function csvFilename(kind: "liked" | "list" | "all") {
  const day = new Date().toISOString().slice(0, 10);
  if (kind === "liked") return `spookyhouzz-saved-${day}.csv`;
  if (kind === "all") return `spookyhouzz-houses-${day}.csv`;
  return `spookyhouzz-list-${day}.csv`;
}

export function sheetFilename(kind: "liked" | "list" | "all") {
  return csvFilename(kind).replace(/\.csv$/, ".xlsx");
}
