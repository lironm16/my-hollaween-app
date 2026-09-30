import { NextResponse } from "next/server";
import { adminUserPreviewMode, isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  const admin = await isAdmin();
  return NextResponse.json({
    admin,
    userPreview: admin ? await adminUserPreviewMode() : false,
  });
}
