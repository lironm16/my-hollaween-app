/** Playwright install-help screenshots — show header ↓ without native beforeinstallprompt. */
export const HELP_INSTALL_CAPTURE_PARAM = "helpInstallCapture";

export function readHelpInstallCaptureFromLocation(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(HELP_INSTALL_CAPTURE_PARAM) === "1";
}
