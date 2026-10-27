"use client";

import { useLocale } from "@/hooks/use-locale";
import { renderHelpText } from "@/lib/render-help-text";
import type { ReactNode } from "react";

/** Parses string children for emphasis and locale-correct menu-path arrows. */
export function HelpText({ children }: { children: ReactNode }) {
  const { dir } = useLocale();
  if (typeof children === "string") return renderHelpText(children, { dir });
  return children;
}
