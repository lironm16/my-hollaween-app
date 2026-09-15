export type TempSkipRestoreAlert = {
  id: string;
  message: string;
};

export const TEMP_SKIP_RESTORE_EVENT = "hw-temp-skip-restored";

export function emitTempSkipRestoreAlert(alert: TempSkipRestoreAlert) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<TempSkipRestoreAlert>(TEMP_SKIP_RESTORE_EVENT, { detail: alert }));
}
