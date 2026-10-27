"use client";

import { AppHeader } from "@/components/app-header";
import { DeviceSettings } from "@/components/device-settings";
import { useLocale } from "@/hooks/use-locale";

export default function SettingsPage() {
  const { t, dir } = useLocale();

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-lg space-y-4 pb-10" dir={dir}>
          <h1 className="font-display text-2xl text-orange-300">{t("settings.title")}</h1>
          <DeviceSettings />
        </div>
      </main>
    </div>
  );
}
