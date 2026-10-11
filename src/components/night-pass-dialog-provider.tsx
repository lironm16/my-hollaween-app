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
import { NightPassRegisterPanel } from "@/components/night-pass-register-panel";
import { NightPassesCard } from "@/components/night-passes-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminSession } from "@/hooks/use-admin-session";

type NightPassDialogContextValue = {
  openRegister: (initialCode?: string) => void;
  openOwnerPasses: (houseId: string) => void;
};

const NightPassDialogContext = createContext<NightPassDialogContextValue | null>(null);

export function NightPassDialogProvider({ children }: { children: ReactNode }) {
  const { admin } = useAdminSession();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerCode, setRegisterCode] = useState("");
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [ownerHouseId, setOwnerHouseId] = useState<string | null>(null);

  const openRegister = useCallback((initialCode = "") => {
    setRegisterCode(initialCode.replace(/[\s-]/g, "").toUpperCase());
    setRegisterOpen(true);
  }, []);

  const openOwnerPasses = useCallback((houseId: string) => {
    setOwnerHouseId(houseId);
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
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="max-h-[min(90dvh,640px)] overflow-y-auto border-orange-500/25 bg-[#12081a] pt-12 text-violet-50">
          <DialogHeader className="items-center text-center">
            <DialogTitle className="font-display text-xl text-orange-300 pe-8">
              כרטיס כניסה לאירוע
            </DialogTitle>
          </DialogHeader>
          <NightPassRegisterPanel
            key={registerOpen ? registerCode || "open" : "closed"}
            initialCode={registerCode}
            compact
            onRegistered={() => setRegisterOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={ownerOpen} onOpenChange={setOwnerOpen}>
        <DialogContent className="max-h-[min(92dvh,720px)] overflow-y-auto border-orange-500/25 bg-[#12081a] pt-12 text-violet-50 sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <DialogTitle className="font-display text-xl text-orange-300 pe-8">
              4 מכשירים לאירוע
            </DialogTitle>
          </DialogHeader>
          {ownerHouseId ? (
            <NightPassesCard houseId={ownerHouseId} admin={admin} embedded />
          ) : null}
        </DialogContent>
      </Dialog>
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
  openRegister: (initialCode?: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
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
