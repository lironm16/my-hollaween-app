import { readRehearsalScene, writeRehearsalScene } from "@/lib/app-clock";

const CLOCK_KEY = "hw-rehearsal-scene";

/** Server/build-time preview detection (Vercel preview deployments). */
export function isPreviewDeploy() {
  return (
    process.env.VERCEL_ENV === "preview" || process.env.NEXT_PUBLIC_PREVIEW_DEPLOY === "1"
  );
}

/** Client preview detection — baked at build time on Vercel. */
export function isPreviewDeployClient() {
  if (typeof window === "undefined") return false;
  return (
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_PREVIEW_DEPLOY === "1"
  );
}

/** Whether rehearsal stubs / dry-run defaults apply without admin login. */
export function previewTestModeEnabled() {
  return isPreviewDeployClient();
}

/**
 * On preview deployments, default to all houses (incl. stubs) and Halloween
 * open-hours rehearsal — only when the user has not chosen settings yet.
 */
export function bootstrapPreviewDeploy() {
  if (!isPreviewDeployClient()) return;
  try {
    if (!localStorage.getItem(CLOCK_KEY) && readRehearsalScene() === "off") {
      writeRehearsalScene("open");
    }
  } catch {
    /* private mode */
  }
}
