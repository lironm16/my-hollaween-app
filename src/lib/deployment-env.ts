/** True on Vercel Preview deployments (client — set at build from VERCEL_ENV). */
export function isPreviewDeploymentClient() {
  return process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
}

/** True on Vercel Preview deployments (server/API routes). */
export function isPreviewDeploymentServer() {
  return process.env.VERCEL_ENV === "preview";
}

/** Preview / branch deploys on Vercel (not production). */
export function isVercelNonProductionServer() {
  if (process.env.VERCEL !== "1") return false;
  return process.env.VERCEL_ENV !== "production";
}
