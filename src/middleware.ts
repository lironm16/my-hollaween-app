import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Retired help screenshots (real addresses) — block even if an old PNG remains in public/. */
const BLOCKED_STATIC_PATHS = new Set(["/images/help/share-edit-code-menu.png"]);

export function middleware(request: NextRequest) {
  if (BLOCKED_STATIC_PATHS.has(request.nextUrl.pathname)) {
    return new NextResponse(null, { status: 404, statusText: "Not Found" });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/images/help/share-edit-code-menu.png"],
};
