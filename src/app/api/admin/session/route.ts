import { NextResponse } from "next/server";
import { adminLoginEnabled, adminLoginHintHe, adminUserPreviewMode, isAdmin } from "@/lib/admin";
import { isPreviewDeploymentServer, isVercelNonProductionServer } from "@/lib/deployment-env";

export const runtime = "nodejs";

export async function GET() {
  const admin = await isAdmin();
  const previewDeployment = isPreviewDeploymentServer() || isVercelNonProductionServer();
  return NextResponse.json({
    admin,
    userPreview: admin ? await adminUserPreviewMode() : false,
    loginEnabled: adminLoginEnabled(),
    previewDeployment,
    loginHint: adminLoginHintHe(),
  });
}
