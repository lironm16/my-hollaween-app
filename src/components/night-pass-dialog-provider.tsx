"use client";

import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EditCodeDialog } from "@/components/edit-code-dialog";
import { HouseEditModal } from "@/components/house-edit-modal";
import { NightPassRegisterPanel } from "@/components/night-pass-register-panel";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useNightPass } from "@/hooks/use-night-pass";
import { readNightPassState } from "@/lib/night-pass-client";
import type { PublicHouse } from "@/lib/types";

type NightPassDialogContextValue = {
  openRegister: (initialCode?: string, inviteToken?: string) => void;
  /** After add-house — same dialog as ⋮ → קוד עריכה ומכשירים. */
  openOwnerPasses: (house: PublicHouse, editCode: string) => void;
};

const NightPassDialogContext = createContext<NightPassDialogContextValue | null>(null);

export function NightPassDialogProvider({ children }: { children: ReactNode }) {
  const { admin } = useAdminSession();
  const nightPass = useNightPass();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerCode, setRegisterCode] = useState("");
  const [registerInvite, setRegisterInvite] = useState("");
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [ownerHouse, setOwnerHouse] = useState<PublicHouse | null>(null);
  const [ownerEditCode, setOwnerEditCode] = useState("");

  const openRegister = useCallback((initialCode = "", inviteToken = "") => {
    const code = initialCode.replace(/[\s-]/g, "").toUpperCase();
    const invite = inviteToken.trim();
    if (readNightPassState().registered && !code && !invite) return;
    setRegisterCode(code);
    setRegisterInvite(invite);
    setRegisterOpen(true);
  }, []);

  const openOwnerPasses = useCallback((house: PublicHouse, editCode: string) => {
    setOwnerHouse(house);
    setOwnerEditCode(editCode);
    setOwnerOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openRegister, openOwnerPasses }),
    [openRegister, openOwnerPasses],
  );

  return (
    <NightPassDialogContext.Provider value={value}>
      <Suspense fallback={null}>
        <PassQueryOpener openRegister={openRegister} />
      </Suspense>
      {children}
      <HouseEditModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="מכשיר מחובר"
      >
        <NightPassRegisterPanel
          key={registerOpen ? registerCode || "open" : "closed"}
          initialCode={registerCode}
          inviteToken={registerInvite}
          compact
          onRegistered={() => setRegisterOpen(false)}
          onNavigateAway={() => setRegisterOpen(false)}
        />
      </HouseEditModal>
      {ownerHouse && ownerEditCode ? (
        <EditCodeDialog
          open={ownerOpen}
          house={ownerHouse}
          editCode={ownerEditCode}
          admin={admin}
          nightPassesEnabled={nightPass.enabled}
          onClose={() => setOwnerOpen(false)}
        />
      ) : null}
    </NightPassDialogContext.Provider>
  );
}

export function useNightPassDialog() {
  const ctx = useContext(NightPassDialogContext);
  if (!ctx) {
    throw new Error("useNightPassDialog must be used within NightPassDialogProvider");
  }
  return ctx;
}

/** Safe when provider is absent (tests). */
export function useNightPassDialogOptional() {
  return useContext(NightPassDialogContext);
}

function PassQueryOpener({
  openRegister,
}: {
  openRegister: (initialCode?: string, inviteToken?: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const invite = searchParams.get("invite") ?? "";
    if (invite) {
      openRegister("", invite);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("invite");
      const qs = next.toString();
      router.replace(qs ? `/?${qs}` : "/");
      return;
    }
    if (searchParams.get("openPass") !== "1") return;
    const code = searchParams.get("c") ?? "";
    openRegister(code);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("openPass");
    next.delete("c");
    const qs = next.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }, [openRegister, router, searchParams]);

  return null;
}
