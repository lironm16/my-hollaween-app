"use client";

import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EditCodeDialog } from "@/components/edit-code-dialog";
import { HouseEditModal } from "@/components/house-edit-modal";
import { NightPassRegisterPanel } from "@/components/night-pass-register-panel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useNightPass } from "@/hooks/use-night-pass";
import {
  NIGHT_PASS_ALREADY_REGISTERED_BODY,
  NIGHT_PASS_ALREADY_REGISTERED_TITLE,
  NIGHT_PASS_EVENT_REGISTERED_CONTINUE,
  NIGHT_PASS_EVENT_REGISTERED_TITLE,
  nightPassEventRegisteredBody,
  type HouseAccessRegistrationKind,
} from "@/lib/night-pass-copy";
import {
  NIGHT_PASS_OWNER_REGISTER_EVENT,
  clientMayUseOwnerRegister,
  notifyNightPassSlotsChanged,
  preferredOwnerRegisterHouseId,
  readNightPassState,
  refreshNightPassState,
  resetOwnerUnlockAttempts,
  setNightPassRefreshPaused,
  type NightPassOwnerRegisterDetail,
} from "@/lib/night-pass-client";
import type { PublicHouse } from "@/lib/types";

type NightPassDialogContextValue = {
  openRegister: (initialCode?: string, inviteToken?: string) => void;
  /** Owner unlocked a house — register for the event without an entrance code. */
  openOwnerRegister: (houseId?: string) => void;
  /** After add-house — same dialog as ⋮ → קוד עריכה ומכשירים. */
  openOwnerPasses: (house: PublicHouse, editCode: string) => void;
  /** First-time event registration (add house or owner login). */
  openEventRegistered: (options?: EventRegisteredOptions) => void;
};

export type EventRegisteredOptions = {
  houseName?: string;
  houseId?: string;
  registrationKind?: HouseAccessRegistrationKind;
  afterClose?: () => void | Promise<void>;
};

const NightPassDialogContext = createContext<NightPassDialogContextValue | null>(null);

export function NightPassDialogProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { admin } = useAdminSession();
  const nightPass = useNightPass();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerCode, setRegisterCode] = useState("");
  const [registerInvite, setRegisterInvite] = useState("");
  const [ownerRegisterMode, setOwnerRegisterMode] = useState(false);
  const [ownerRegisterHouseId, setOwnerRegisterHouseId] = useState("");
  const [alreadyRegisteredOpen, setAlreadyRegisteredOpen] = useState(false);
  const [eventRegisteredOpen, setEventRegisteredOpen] = useState(false);
  const [eventRegisteredMeta, setEventRegisteredMeta] = useState<{
    houseName?: string;
    houseId?: string;
    registrationKind?: HouseAccessRegistrationKind;
  }>({});
  const eventRegisteredAfterCloseRef = useRef<(() => void | Promise<void>) | null>(null);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [ownerHouse, setOwnerHouse] = useState<PublicHouse | null>(null);
  const [ownerEditCode, setOwnerEditCode] = useState("");

  const openRegister = useCallback((initialCode = "", inviteToken = "") => {
    const code = initialCode.replace(/[\s-]/g, "").toUpperCase();
    const invite = inviteToken.trim();
    if (readNightPassState().registered && !code && !invite) return;
    setOwnerRegisterMode(false);
    setOwnerRegisterHouseId("");
    setRegisterCode(code);
    setRegisterInvite(invite);
    setRegisterOpen(true);
  }, []);

  const openOwnerRegister = useCallback((houseId = "") => {
    if (readNightPassState().registered) return;
    resetOwnerUnlockAttempts();
    setOwnerRegisterMode(true);
    setRegisterCode("");
    setRegisterInvite("");
    setOwnerRegisterHouseId(houseId.trim());
    setRegisterOpen(true);
  }, []);

  useEffect(() => {
    const onOwnerRegister = (event: Event) => {
      const detail = (event as CustomEvent<NightPassOwnerRegisterDetail>).detail;
      openOwnerRegister(detail?.houseId ?? "");
    };
    window.addEventListener(NIGHT_PASS_OWNER_REGISTER_EVENT, onOwnerRegister);
    return () => window.removeEventListener(NIGHT_PASS_OWNER_REGISTER_EVENT, onOwnerRegister);
  }, [openOwnerRegister]);

  const openOwnerPasses = useCallback((house: PublicHouse, editCode: string) => {
    setOwnerHouse(house);
    setOwnerEditCode(editCode);
    setOwnerOpen(true);
  }, []);

  const finishEventRegistered = useCallback(async (navigateToMap: boolean) => {
    const afterClose = eventRegisteredAfterCloseRef.current;
    eventRegisteredAfterCloseRef.current = null;
    const focusId = eventRegisteredMeta.houseId?.trim();
    setEventRegisteredOpen(false);
    setEventRegisteredMeta({});
    setNightPassRefreshPaused(false);
    await refreshNightPassState({ force: true });
    notifyNightPassSlotsChanged();
    await afterClose?.();
    if (navigateToMap) {
      router.push(focusId ? `/?focus=${encodeURIComponent(focusId)}` : "/");
    }
  }, [eventRegisteredMeta.houseId, router]);

  const openEventRegistered = useCallback((options?: EventRegisteredOptions) => {
    setNightPassRefreshPaused(true);
    eventRegisteredAfterCloseRef.current = options?.afterClose ?? null;
    setEventRegisteredMeta({
      houseName: options?.houseName?.trim(),
      houseId: options?.houseId?.trim(),
      registrationKind: options?.registrationKind ?? "owner",
    });
    setEventRegisteredOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openRegister, openOwnerRegister, openOwnerPasses, openEventRegistered }),
    [openRegister, openOwnerRegister, openOwnerPasses, openEventRegistered],
  );

  return (
    <NightPassDialogContext.Provider value={value}>
      <Suspense fallback={null}>
        <PassQueryOpener
          openRegister={openRegister}
          openOwnerRegister={openOwnerRegister}
          onInviteForRegisteredDevice={() => setAlreadyRegisteredOpen(true)}
        />
      </Suspense>
      {children}
      <HouseEditModal
        open={alreadyRegisteredOpen}
        onClose={() => setAlreadyRegisteredOpen(false)}
        title="מכשיר מחובר"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-950/70 px-4 py-5 text-center ring-2 ring-emerald-400/40">
            <p className="text-xl font-semibold text-emerald-100">{NIGHT_PASS_ALREADY_REGISTERED_TITLE}</p>
            <p className="mt-2 text-base leading-relaxed text-emerald-200/95">
              {NIGHT_PASS_ALREADY_REGISTERED_BODY}
            </p>
          </div>
          <Button
            type="button"
            className="h-11 w-full bg-emerald-500 text-black hover:bg-emerald-400"
            onClick={() => setAlreadyRegisteredOpen(false)}
          >
            סגירה
          </Button>
        </div>
      </HouseEditModal>
      <HouseEditModal
        open={eventRegisteredOpen}
        onClose={() => void finishEventRegistered(false)}
        title={NIGHT_PASS_EVENT_REGISTERED_TITLE}
      >
        <div className="space-y-4">
          <p className="text-center text-base leading-relaxed text-emerald-200/95">
            {nightPassEventRegisteredBody(
              eventRegisteredMeta.houseName ?? "",
              eventRegisteredMeta.registrationKind ?? "owner",
            )}
          </p>
          <Button
            type="button"
            className="h-11 w-full bg-emerald-500 text-black hover:bg-emerald-400"
            onClick={() => void finishEventRegistered(true)}
          >
            {NIGHT_PASS_EVENT_REGISTERED_CONTINUE}
          </Button>
        </div>
      </HouseEditModal>
      <HouseEditModal
        open={registerOpen}
        onClose={() => {
          setRegisterOpen(false);
          setOwnerRegisterMode(false);
          setOwnerRegisterHouseId("");
        }}
        title={ownerRegisterMode ? "חיבור לאירוע" : "מכשיר מחובר"}
      >
        <NightPassRegisterPanel
          key={
            registerOpen
              ? ownerRegisterMode
                ? `owner-${ownerRegisterHouseId || "any"}`
                : registerCode || registerInvite || "open"
              : "closed"
          }
          initialCode={registerCode}
          inviteToken={registerInvite}
          ownerRegister={ownerRegisterMode}
          ownerHouseId={ownerRegisterHouseId || undefined}
          compact
          onRegistered={() => setRegisterOpen(false)}
          onEventRegistered={(detail) => {
            setRegisterOpen(false);
            openEventRegistered({
              houseName: detail.houseName,
              houseId: detail.houseId,
              registrationKind: detail.registrationKind,
            });
          }}
          onNavigateAway={() => setRegisterOpen(false)}
          onAlreadyRegistered={() => {
            setRegisterOpen(false);
            setAlreadyRegisteredOpen(true);
          }}
        />
      </HouseEditModal>
      {ownerHouse ? (
        <EditCodeDialog
          open={ownerOpen}
          house={ownerHouse}
          editCode={ownerEditCode.trim() || undefined}
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
  openOwnerRegister,
  onInviteForRegisteredDevice,
}: {
  openRegister: (initialCode?: string, inviteToken?: string) => void;
  openOwnerRegister: (houseId?: string) => void;
  onInviteForRegisteredDevice: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const invite = searchParams.get("invite") ?? "";
    if (invite) {
      void (async () => {
        const next = new URLSearchParams(searchParams.toString());
        next.delete("invite");
        const qs = next.toString();
        router.replace(qs ? `/?${qs}` : "/");

        try {
          const prefill = await fetch(
            `/api/night-passes/invite-prefill?invite=${encodeURIComponent(invite)}`,
            { cache: "no-store" },
          );
          const json = (await prefill.json()) as { ok?: boolean };
          if (!json.ok) {
            toast.error("הבית הוסר מהאירוע — לא ניתן להירשם מהזמנה הזו.");
            return;
          }
        } catch {
          toast.error("לא הצלחנו לבדוק את ההזמנה. נסו שוב.");
          return;
        }

        const state = (await refreshNightPassState({ force: true })) ?? readNightPassState();
        if (state.registered) {
          onInviteForRegisteredDevice();
        } else {
          openRegister("", invite);
        }
      })();
      return;
    }
    if (searchParams.get("openPass") !== "1") return;
    const code = searchParams.get("c") ?? "";
    const next = new URLSearchParams(searchParams.toString());
    next.delete("openPass");
    next.delete("c");
    const qs = next.toString();
    router.replace(qs ? `/?${qs}` : "/");
    void refreshNightPassState({ force: true }).then((state) => {
      const pass = state ?? readNightPassState();
      if (clientMayUseOwnerRegister(pass)) {
        openOwnerRegister(preferredOwnerRegisterHouseId(pass));
      } else {
        openRegister(code);
      }
    });
  }, [openRegister, openOwnerRegister, onInviteForRegisteredDevice, router, searchParams]);

  return null;
}
