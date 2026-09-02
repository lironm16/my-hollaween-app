import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ admin: await isAdmin() });
}
