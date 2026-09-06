import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { asCatalog, getAllHouses } from "@/lib/store";
import { housesToCsv } from "@/lib/house-csv";
import { toPublicHouse } from "@/lib/ids";
import { getHouseTraffic } from "@/lib/traffic-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const houses = await getAllHouses();
  const format = new URL(request.url).searchParams.get("format");
  if (format === "csv") {
    const listed = houses.filter((house) => house.status !== "rejected").map(toPublicHouse);
    const traffic = await getHouseTraffic();
    const csv = housesToCsv(listed, traffic);
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
