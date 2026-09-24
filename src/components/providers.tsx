"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AppClockProvider } from "@/components/app-clock-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { TabTitleCycle } from "@/components/tab-title-cycle";
import { CatalogProvider } from "@/components/catalog-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <AppClockProvider>
      <CatalogProvider>
        <TabTitleCycle />
        {children}
        <Toaster dir="rtl" position="top-center" theme="dark" />
        <ServiceWorkerRegister />
      </CatalogProvider>
      </AppClockProvider>
    </ThemeProvider>
  );
}
