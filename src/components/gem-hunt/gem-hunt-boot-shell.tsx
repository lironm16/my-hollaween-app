"use client";

import { createPortal } from "react-dom";
import { GEM_GAME_TITLE_HE } from "@/lib/gem-hunt-copy";
import { getGemHuntPortalRoot } from "@/lib/gem-hunt-portal-root";

/** Opaque full-screen cover while hunt mode picks WebXR vs camera (camera must not run under the map). */
export function GemHuntBootShell() {
  const shell = (
    <div className="gem-hunt-boot-shell" role="status" aria-live="polite" aria-busy="true">
      <p className="gem-hunt-boot-shell__text">פותחים מצלמת {GEM_GAME_TITLE_HE}…</p>
    </div>
  );
  if (typeof document === "undefined") return shell;
  return createPortal(shell, getGemHuntPortalRoot());
}
