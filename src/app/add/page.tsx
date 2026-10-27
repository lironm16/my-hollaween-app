"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { HouseForm } from "@/components/house-form";
import { HouseEditFlowPanels, useHouseEditFlow } from "@/components/house-edit-flow";
import { Button, buttonVariants } from "@/components/ui/button";
import { saveOwnedHouse, notifyCatalogChanged, rememberPublishedHouse } from "@/lib/offline-db";
import { PersistNote } from "@/components/persist-note";
import {
  detectNightPassClientBrowser,
  detectNightPassClientSurface,
} from "@/lib/night-pass-client-surface";
import { publishHouse } from "@/lib/publish-house";
import { publishHousePhoto } from "@/lib/house-photo";
import { senderPushEndpoint } from "@/lib/push-client";
import type { HouseInput, PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { HouseFormExtras } from "@/components/house-form";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useAddHouseOpen } from "@/hooks/use-add-house-open";
import { useNightPassDialog } from "@/components/night-pass-dialog-provider";
import { useNightPass } from "@/hooks/use-night-pass";
import { useLocale } from "@/hooks/use-locale";
import { formatMessage } from "@/lib/i18n/format";

export default function AddPage() {
  const router = useRouter();
  const { t, dir } = useLocale();
  const { admin } = useAdminSession();
  const editFlow = useHouseEditFlow();
  const addHouseOpen = useAddHouseOpen();
  const nightPass = useNightPass();
  const { openOwnerPasses, openEventRegistered } = useNightPassDialog();
  const eventPopupForAddRef = useRef<string | null>(null);
  const canAdd = addHouseOpen;
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    id: string;
    editCode: string;
    name: string;
    house: PublicHouse;
    deviceConnected: boolean;
  } | null>(null);

  useEffect(() => {
    if (!done || !nightPass.enabled || !done.deviceConnected) return;
    if (eventPopupForAddRef.current === done.id) return;
    eventPopupForAddRef.current = done.id;
    openEventRegistered({
      houseName: done.name,
      houseId: done.id,
      afterClose: () => {
        notifyCatalogChanged();
      },
    });
  }, [done, nightPass.enabled, openEventRegistered]);

  async function onSubmit(input: HouseInput, extras?: HouseFormExtras) {
    setBusy(true);
    try {
      const includeEndpoint = await Promise.race([
        senderPushEndpoint(),
        new Promise<undefined>((resolve) => window.setTimeout(() => resolve(undefined), 2000)),
      ]);
      const rawBrowser = detectNightPassClientBrowser();
      const { house, editCode, deviceConnected } = await publishHouse(input, {
        includeEndpoint,
        addedBy: extras?.addedBy ?? undefined,
        ownerPhone: extras?.ownerPhone ?? undefined,
        admin,
        clientSurface: detectNightPassClientSurface(),
        ...(rawBrowser !== "other" ? { clientBrowser: rawBrowser } : {}),
      });
      let preview = house;
      if (extras?.photoDataUrl) {
        try {
          preview = await publishHousePhoto(house.id, editCode, extras.photoDataUrl);
        } catch {
          toast.warning(t("add.photoSkipped"));
        }
      }
      saveOwnedHouse({
        id: preview.id,
        name: preview.name,
        editCode,
        preview,
      });
      rememberPublishedHouse(preview);
      setDone({
        id: preview.id,
        editCode,
        name: preview.name,
        house: preview,
        deviceConnected: Boolean(deviceConnected),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("add.submitFailed"));
    } finally {
      setBusy(false);
    }
  }

  const successSubtitle = done
    ? formatMessage(
        nightPass.enabled && done.deviceConnected
          ? t("add.successSubtitleWithEvent")
          : t("add.successSubtitle"),
        { name: done.name },
      )
    : "";

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main
        className="relative z-10 mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto px-4 py-5 pb-10"
        dir={dir}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/banner.jpg"
          alt=""
          className="mb-4 h-28 w-full rounded-2xl object-cover ring-1 ring-orange-500/30"
        />
        {done ? (
          <div className="house-added-success space-y-6 rounded-2xl bg-[#1d1028] p-5 ring-1 ring-orange-400/30">
            <div className="flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="house-added-check size-12 text-emerald-400" />
              <h1 className="font-display text-2xl text-orange-300">{t("add.successTitle")}</h1>
              <p className="max-w-sm text-base leading-relaxed text-violet-100">{successSubtitle}</p>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href={`/?focus=${encodeURIComponent(done.id)}`}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full bg-orange-500 text-black hover:bg-orange-400",
                )}
              >
                {t("add.successViewMap")}
              </Link>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  editFlow.openEdit(done.house, {
                    editCode: done.editCode,
                    allowDelete: true,
                    forceFull: true,
                  })
                }
              >
                {t("add.successEdit")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-orange-400/50 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20"
                onClick={() => openOwnerPasses(done.house, done.editCode)}
              >
                {nightPass.enabled ? t("add.successCodeAndDevices") : t("add.successShareCode")}
              </Button>
            </div>
          </div>
        ) : !canAdd ? (
          <div className="space-y-4 rounded-2xl bg-[#1d1028] p-5 ring-1 ring-orange-500/25">
            <h1 className="font-display text-3xl text-orange-300">{t("add.pageTitle")}</h1>
            <p className="text-lg leading-relaxed text-violet-100">{t("add.closedMessage")}</p>
            <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
              {t("common.backToMap")}
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display mb-1 text-3xl text-orange-300">{t("add.pageTitle")}</h1>
            <p className="mb-4 text-lg text-violet-200">
              {t("add.intro")}{" "}
              <Link href="/help/add-house" className="text-orange-300 underline underline-offset-2">
                {t("common.howToLink")}
              </Link>
            </p>
            <PersistNote className="mb-4" />
            <HouseForm
              submitLabel={t("common.save")}
              onSubmit={onSubmit}
              onCancel={() => router.push("/")}
              busy={busy}
            />
          </>
        )}
      </main>
      {done ? (
        <HouseEditFlowPanels
          flow={editFlow.flow}
          setFlow={editFlow.setFlow}
          onClose={editFlow.close}
          onUpdated={(next) => {
            setDone((current) =>
              current ? { ...current, id: next.id, name: next.name, house: next } : current,
            );
            saveOwnedHouse({
              id: next.id,
              name: next.name,
              editCode: done.editCode,
              preview: next,
            });
            notifyCatalogChanged();
          }}
          onDeleted={() => {
            editFlow.close();
            router.push("/");
          }}
        />
      ) : null}
    </div>
  );
}
