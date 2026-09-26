"use client";

import { useSyncExternalStore } from "react";
import {
  readGemPreviewAsUser,
  subscribeGemPreviewAsUser,
  writeGemPreviewAsUser,
} from "@/lib/gem-preview-as-user";

export function useGemPreviewAsUser() {
  const previewAsUser = useSyncExternalStore(
    subscribeGemPreviewAsUser,
    readGemPreviewAsUser,
    () => false,
  );
  return {
    previewAsUser,
    setPreviewAsUser: writeGemPreviewAsUser,
  };
}
