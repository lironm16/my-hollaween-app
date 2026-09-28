"use client";

import { useEffect, useState } from "react";
import { isVisualKeyboardOpen, subscribeAppViewport } from "@/lib/viewport";

export function useVisualKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    return subscribeAppViewport(() => {
      setOpen(isVisualKeyboardOpen());
    });
  }, []);
  return open;
}
