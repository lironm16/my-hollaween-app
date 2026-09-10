"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { TabTitleCycle } from "@/components/tab-title-cycle";
import { PresenceBeacon } from "@/hooks/use-presence";
import { subscribeAppViewport } from "@/lib/viewport";

function AppViewportSync() {
  useEffect(() => subscribeAppViewport(), []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <AppViewportSync />
      <PresenceBeacon />
      <TabTitleCycle />
      {children}
      <Toaster dir="rtl" position="top-center" theme="dark" />
      <ServiceWorkerRegister />
    </ThemeProvider>
  );
}
