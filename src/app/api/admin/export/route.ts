import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { asCatalog, getAllHouses } from "@/lib/store";
import { housesToCsv, housesToXlsx } from "@/lib/house-csv";
import { toPublicHouse } from "@/lib/ids";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const houses = await getAllHouses();
  const format = new URL(request.url).searchParams.get("format");
  if (format === "csv" || format === "xls" || format === "xlsx") {
    const listed = houses.filter((house) => house.status !== "rejected").map(toPublicHouse);
    if (format === "xls" || format === "xlsx") {
      const xlsx = housesToXlsx(listed);
      return new NextResponse(Buffer.from(xlsx), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=spookyhouzz-houses.xlsx",
          "Cache-Control": "no-store",
        },
      });
    }
    const csv = housesToCsv(listed);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=spookyhouzz-houses.csv",
        "Cache-Control": "no-store",
      },
    });
  }
  const catalog = asCatalog(houses, new Date().toISOString());
  return NextResponse.json(catalog, {
    headers: {
      "Content-Disposition": "attachment; filename=catalog.json",
      "Cache-Control": "no-store",
    },
  });
}
