"use client";

import { ThemeProvider } from "next-themes";
import { AppClockProvider } from "@/components/app-clock-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { TabTitleCycle } from "@/components/tab-title-cycle";
import { CatalogProvider } from "@/components/catalog-provider";
import { NightPassDialogProvider } from "@/components/night-pass-dialog-provider";
import { PwaInstallProvider } from "@/components/pwa-install-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { ThemedToaster } from "@/components/themed-toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <LocaleProvider>
      <AppClockProvider>
      <CatalogProvider>
        <NightPassDialogProvider>
          <PwaInstallProvider>
            <TabTitleCycle />
            {children}
            <ThemedToaster />
            <ServiceWorkerRegister />
          </PwaInstallProvider>
        </NightPassDialogProvider>
      </CatalogProvider>
      </AppClockProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
