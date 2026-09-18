"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AndroidInstallGuard } from "@/components/android-install-guard";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { TabTitleCycle } from "@/components/tab-title-cycle";
import { CatalogProvider } from "@/components/catalog-provider";
import { useActivitySync } from "@/hooks/use-activity-sync";
import { subscribeAppViewport } from "@/lib/viewport";

function AppViewportSync() {
  useEffect(() => subscribeAppViewport(), []);
  return null;
}

function ActivitySync() {
  useActivitySync();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <CatalogProvider>
        <AppViewportSync />
        <ActivitySync />
        <TabTitleCycle />
        {children}
        <Toaster dir="rtl" position="top-center" theme="dark" />
        <AndroidInstallGuard />
        <ServiceWorkerRegister />
      </CatalogProvider>
    </ThemeProvider>
  );
}
