import { NextResponse } from "next/server";
import {
  adminUserPreviewMode,
  isAdmin,
  setAdminUserPreviewMode,
} from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ userPreview: await adminUserPreviewMode() });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { enabled?: boolean } | null;
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  await setAdminUserPreviewMode(body.enabled);
  return NextResponse.json({ ok: true, userPreview: body.enabled });
}
