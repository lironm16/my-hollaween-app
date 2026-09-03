"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { TabTitleCycle } from "@/components/tab-title-cycle";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <TabTitleCycle />
      {children}
      <Toaster dir="rtl" position="top-center" theme="dark" />
      <ServiceWorkerRegister />
    </ThemeProvider>
  );
}
