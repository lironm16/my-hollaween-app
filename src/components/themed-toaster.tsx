"use client";

import { Toaster } from "@/components/ui/sonner";
import { useLocale } from "@/hooks/use-locale";

export function ThemedToaster() {
  const { dir } = useLocale();
  return <Toaster dir={dir} position="top-center" theme="dark" />;
}
