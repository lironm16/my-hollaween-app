"use client";

import { useSyncExternalStore } from "react";
import {
  readAdminPreviewAsUser,
  subscribeAdminPreviewAsUser,
  writeAdminPreviewAsUser,
} from "@/lib/admin-preview-as-user";

export function useAdminPreviewAsUser() {
  const previewAsUser = useSyncExternalStore(
    subscribeAdminPreviewAsUser,
    readAdminPreviewAsUser,
    () => false,
  );
  return {
    previewAsUser,
    setPreviewAsUser: writeAdminPreviewAsUser,
  };
}
