import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { isPreviewDeploymentServer, isVercelNonProductionServer } from "@/lib/deployment-env";

const DEV_ADMIN_PASSWORD = "pumpkin2026";

function previewAdminAllowed() {
  return isPreviewDeploymentServer() || isVercelNonProductionServer();
}

export function adminPassword() {
  const configured = process.env.ADMIN_PASSWORD?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production" && previewAdminAllowed()) {
    return process.env.PREVIEW_ADMIN_PASSWORD?.trim() || DEV_ADMIN_PASSWORD;
  }
  return DEV_ADMIN_PASSWORD;
}

/** Production must set ADMIN_PASSWORD explicitly. Preview may use PREVIEW_ADMIN_PASSWORD or the dev default. */
export function adminLoginEnabled() {
  if (process.env.NODE_ENV !== "production") return true;
  if (previewAdminAllowed()) return true;
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}

/** For /admin UI — whether preview uses the documented default password. */
export function adminLoginHintHe(): string | null {
  if (!adminLoginEnabled()) {
    return "כניסת מנהל לא פעילה בפריסת Production. פתחו את קישור ה-Preview של הענף (לא my-hollaween-app.vercel.app).";
  }
  if (!previewAdminAllowed()) return null;
  if (process.env.ADMIN_PASSWORD?.trim()) {
    return "סביבת Preview: השתמשו ב-ADMIN_PASSWORD שהוגדר ב-Vercel ל-Preview.";
  }
  if (process.env.PREVIEW_ADMIN_PASSWORD?.trim()) {
    return "סביבת Preview: השתמשו ב-PREVIEW_ADMIN_PASSWORD מ-Vercel.";
  }
  return `סביבת Preview: סיסמת ברירת המחדל היא ${DEV_ADMIN_PASSWORD} (אלא אם תגדירו PREVIEW_ADMIN_PASSWORD).`;
}

function sign() {
  return createHmac("sha256", adminPassword()).update("ok").digest("hex");
}

export function passwordMatches(input: string) {
  const expected = Buffer.from(adminPassword());
  const got = Buffer.from(input);
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}

export async function setAdminCookie() {
  const jar = await cookies();
  jar.set(config.adminCookie, sign(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(config.adminCookie);
}

export async function isAdmin() {
  const jar = await cookies();
  const value = jar.get(config.adminCookie)?.value;
  if (!value) return false;
  const expected = sign();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const USER_PREVIEW_COOKIE = "hw_admin_user_preview";

/** Admin chose «מצב משתמש» — public APIs behave like a visitor on this browser. */
export async function adminUserPreviewMode() {
  if (!(await isAdmin())) return false;
  const jar = await cookies();
  return jar.get(USER_PREVIEW_COOKIE)?.value === "1";
}

/** Full manager powers (catalog bypass, device bypass, address bypass). */
export async function hasAdminBypass() {
  return (await isAdmin()) && !(await adminUserPreviewMode());
}

export async function setAdminUserPreviewMode(enabled: boolean) {
  if (!(await isAdmin())) return;
  const jar = await cookies();
  if (enabled) {
    jar.set(USER_PREVIEW_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    jar.delete(USER_PREVIEW_COOKIE);
  }
}

export async function clearAdminUserPreviewMode() {
  const jar = await cookies();
  jar.delete(USER_PREVIEW_COOKIE);
}
