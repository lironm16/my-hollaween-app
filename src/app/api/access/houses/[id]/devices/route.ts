import { NextResponse } from "next/server";
import { canonicalHouseId } from "@/lib/ids";
import { getHouseDevicePanel } from "@/lib/house-access/service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const panel = await getHouseDevicePanel(id);
  if ("error" in panel) {
    if (panel.error === "forbidden") {
      return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
    }
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
  }
  return NextResponse.json(panel);
}
