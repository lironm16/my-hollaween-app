import { NextResponse } from "next/server";
import { adminLoginEnabled, passwordMatches, setAdminCookie } from "@/lib/admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Machine-readable codes — UI maps these with {@link adminPage} messages. */
export type AdminLoginErrorCode =
  | "not_configured"
  | "rate_limited"
  | "wrong_password"
  | "server_error";

export async function POST(request: Request) {
  try {
    if (!adminLoginEnabled()) {
      return NextResponse.json({ error: "not_configured" satisfies AdminLoginErrorCode }, { status: 503 });
    }
    if (!rateLimit(`admin:${clientKey(request.headers)}`, 12, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "rate_limited" satisfies AdminLoginErrorCode }, { status: 429 });
    }
    const body = (await request.json().catch(() => null)) as { password?: string } | null;
    if (!body?.password || !passwordMatches(body.password)) {
      return NextResponse.json({ error: "wrong_password" satisfies AdminLoginErrorCode }, { status: 401 });
    }
    await setAdminCookie();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" satisfies AdminLoginErrorCode }, { status: 500 });
  }
}
